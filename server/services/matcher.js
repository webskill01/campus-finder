'use strict';
const natural = require('natural');
const Item = require('../models/Item');

const TfIdf = natural.TfIdf;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build combined text blob for TF-IDF.
 * Uses: title + description + enriched.keywords (tagger-seeded or Groq-filled later).
 */
function buildTextBlob(item) {
  const kw =
    item.enriched && Array.isArray(item.enriched.keywords)
      ? item.enriched.keywords.join(' ')
      : '';
  return `${item.title} ${item.description} ${kw}`.toLowerCase().trim();
}

/**
 * RGB Euclidean distance between two hex colours.
 * Returns 999 on missing/invalid input — bonus never falsely awarded.
 */
function colorDistance(hex1, hex2) {
  if (!hex1 || !hex2 || !/^#[0-9a-fA-F]{6}$/.test(hex1) || !/^#[0-9a-fA-F]{6}$/.test(hex2)) return 999;
  try {
    const parse = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [r1, g1, b1] = parse(hex1);
    const [r2, g2, b2] = parse(hex2);
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  } catch {
    return 999;
  }
}

/**
 * TF-IDF cosine similarity between two text blobs.
 * Returns 0–1. Caller scales to 0–40 points.
 */
function tfidfCosine(blobA, blobB) {
  if (!blobA || !blobB) return 0;

  const tfidf = new TfIdf();
  tfidf.addDocument(blobA); // index 0 = candidate
  tfidf.addDocument(blobB); // index 1 = new item

  const vecA = {};
  const vecB = {};
  tfidf.listTerms(0).forEach(({ term, tfidf: s }) => { vecA[term] = s; });
  tfidf.listTerms(1).forEach(({ term, tfidf: s }) => { vecB[term] = s; });

  const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

  let dot = 0, magA = 0, magB = 0;
  for (const term of allTerms) {
    const a = vecA[term] || 0;
    const b = vecB[term] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Normalize a location string for fuzzy comparison.
 */
function normalizeLocation(loc) {
  return (loc || '').toLowerCase().trim().replace(/[-_\s]+/g, ' ');
}

/**
 * Score two items against each other.
 * Returns { score: number (0–100), signals: string[] }
 *
 * Formula (max 100):
 *   TF-IDF cosine    0–40   title + description + keywords blob
 *   Category         25     exact string match
 *   Location         20     exact match / 12 partial match
 *   Date proximity   15     ≤3 days | 8 ≤7 days | 0 else
 *   Color bonus     +10     RGB Euclidean distance < 30
 */
function scoreItems(itemA, itemB) {
  let score = 0;
  const signals = [];

  // TF-IDF cosine (0–40)
  const cosine = tfidfCosine(buildTextBlob(itemA), buildTextBlob(itemB));
  score += Math.round(cosine * 40);

  // Category (25)
  if (itemA.category === itemB.category) {
    score += 25;
    signals.push('category match');
  }

  // Location (20 exact / 12 partial)
  const locA = normalizeLocation(itemA.location);
  const locB = normalizeLocation(itemB.location);
  if (locA && locB) {
    if (locA === locB) {
      score += 20;
      signals.push('same location');
    } else if (locA.includes(locB) || locB.includes(locA)) {
      score += 12;
      signals.push('nearby location');
    }
  }

  // Date proximity (15 / 8 / 0)
  const date1 = new Date(itemA.itemDate);
  const date2 = new Date(itemB.itemDate);
  if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
    const dayDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
    if (dayDiff <= 3) {
      score += 15;
      signals.push('3 days apart');
    } else if (dayDiff <= 7) {
      score += 8;
      signals.push('within a week');
    }
  }

  // Color bonus (+10) — dominantColor first, fall back to enriched.color
  const colorA = itemA.dominantColor || (itemA.enriched && itemA.enriched.color) || null;
  const colorB = itemB.dominantColor || (itemB.enriched && itemB.enriched.color) || null;
  if (colorDistance(colorA, colorB) < 30) {
    score += 10;
    signals.push('color match');
  }

  return { score: Math.min(score, 100), signals };
}

// ── Bidirectional Update ─────────────────────────────────────────────────────

/**
 * Atomically update targetId's topMatches with a new match entry.
 * Three-step sequence — idempotent (safe for Phase 4 Groq re-runs):
 *   1. $pull removes stale entry for matchId
 *   2. $push adds the fresh scored entry
 *   3. Pipeline update sorts desc + slices to top 3
 */
async function updateTopMatches(targetId, matchId, score, signals, matchTitle, matchCategory, matchLocation) {
  // 1. Remove stale entry (no-op if absent)
  await Item.findByIdAndUpdate(targetId, {
    $pull: { topMatches: { itemId: matchId } }
  });

  // 2. Push fresh entry — include display fields so UI doesn't need extra fetches
  await Item.findByIdAndUpdate(targetId, {
    $push: { topMatches: { itemId: matchId, score, signals, title: matchTitle, category: matchCategory, location: matchLocation } }
  });

  // 3. Sort desc + keep top 3 (aggregation pipeline update)
  await Item.findByIdAndUpdate(targetId, [
    {
      $set: {
        topMatches: {
          $slice: [
            { $sortArray: { input: '$topMatches', sortBy: { score: -1 } } },
            3
          ]
        }
      }
    }
  ]);
}

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * Find and store top matches for a newly created (or re-enriched) item.
 * - Queries opposite-type active items
 * - Scores each using scoreItems()
 * - Keeps top 3 where score > 40
 * - Updates both the new item AND each matched item (bidirectional)
 *
 * Never throws. Called fire-and-forget via setImmediate after POST.
 * Phase 4: Groq service will call this again after enrichment — no changes needed here.
 */
async function computeMatches(item) {
  try {
    const oppositeType = item.type === 'lost' ? 'found' : 'lost';

    // Cap at 500 most-recent candidates — prevents full-scan as DB grows
    const candidates = await Item.find({
      type: oppositeType,
      status: 'active',
      _id: { $ne: item._id }
    }).sort({ createdAt: -1 }).limit(500).lean();

    if (candidates.length === 0) return;

    // Score all, filter threshold, sort desc, take top 3
    const topMatches = candidates
      .map(candidate => {
        const { score, signals } = scoreItems(item, candidate);
        return { candidate, score, signals };
      })
      .filter(({ score }) => score > 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (topMatches.length === 0) return;

    // Bidirectional updates — errors isolated per pair
    await Promise.all(
      topMatches.map(async ({ candidate, score, signals }) => {
        try {
          await updateTopMatches(item._id, candidate._id, score, signals, candidate.title, candidate.category, candidate.location);
          await updateTopMatches(candidate._id, item._id, score, signals, item.title, item.category, item.location);
        } catch (updateErr) {
          console.error(
            `Match update failed ${item._id}↔${candidate._id}:`,
            updateErr
          );
        }
      })
    );
  } catch (err) {
    console.error('computeMatches failed:', err.message);
  }
}

module.exports = { computeMatches, colorDistance };
