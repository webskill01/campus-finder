'use strict';
const Groq = require('groq-sdk');
const Item = require('../models/Item');
const { computeMatches } = require('./matcher');

let groqClient;
try {
  groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
} catch (e) {
  console.error('Failed to initialize Groq client:', e.message);
}
const MODEL = 'llama-3.1-8b-instant';

const ICON_LIST = [
  'smartphone', 'tablet', 'laptop', 'headphones', 'speaker', 'camera',
  'watch', 'key', 'wallet', 'bag', 'backpack', 'briefcase', 'book',
  'glasses', 'umbrella', 'bottle', 'id-card', 'credit-card', 'ring',
  'shirt', 'bicycle', 'helmet', 'zap', 'mouse', 'scissors',
  'trophy', 'dumbbell', 'tool', 'pen', 'music'
];

const CATEGORY_FALLBACK = {
  phone: 'smartphone', keys: 'key', bag: 'backpack',
  documents: 'id-card', electronics: 'laptop',
  accessories: 'watch', clothing: 'shirt', other: 'zap'
};

function parseGroqJSON(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object found in Groq response: "${clean.slice(0, 100)}"`);
  return JSON.parse(match[0]);
}

async function enrichItem(item) {
  try {
    if (!groqClient) {
      console.warn('Groq client not initialized; running match with tagger data for item:', item._id);
      await computeMatches(item);
      return;
    }
    const messages = [
      {
        role: 'system',
        content: 'Extract structured data from lost/found item. Return JSON only.'
      },
      {
        role: 'user',
        content: `Title: ${item.title}, Category: ${item.category}, Description: ${item.description}\nReturn: { cleanDescription, keywords: string[], color: 6-digit hex (#rrggbb) or null, brand: string|null, iconName: string }\niconName must be one of: ${ICON_LIST.join(',')}`
      }
    ];

    const raw = await groqClient.chat.completions.create({ model: MODEL, messages, response_format: { type: 'json_object' } });
    const result = parseGroqJSON(raw.choices[0].message.content);

    const iconName = ICON_LIST.includes(result.iconName)
      ? result.iconName
      : (CATEGORY_FALLBACK[item.category] || 'zap');

    await Item.findByIdAndUpdate(item._id, {
      'enriched.cleanDescription': result.cleanDescription || null,
      'enriched.keywords': Array.isArray(result.keywords) ? result.keywords.slice(0, 20) : [],
      'enriched.color': (result.color && /^#[0-9a-fA-F]{6}$/.test(result.color)) ? result.color : null,
      'enriched.brand': result.brand || null,
      'enriched.iconName': iconName,
      'enriched.enrichedAt': new Date()
    });

    const updatedItem = await Item.findById(item._id).lean();
    await computeMatches(updatedItem || item);
  } catch (err) {
    console.error('enrichItem failed:', err);
    // Always run matching even if enrichment fails — use original tagger-seeded data
    try {
      await computeMatches(item);
    } catch (matchErr) {
      console.error('computeMatches fallback failed:', matchErr.message);
    }
  }
}

async function parseNLSearch(query) {
  try {
    if (!groqClient) {
      console.warn('Groq client not initialized; skipping NL search parsing');
      return null;
    }
    const messages = [
      {
        role: 'system',
        content: 'Parse lost/found search query into filters. Return JSON only.'
      },
      {
        role: 'user',
        content: `Query: ${query}\nReturn: { keywords: string[], category: string|null, location: string|null, dateHint: 'today'|'week'|'all'|null, type: 'lost'|'found'|null }\nValid categories: phone,keys,bag,documents,electronics,accessories,clothing,other\nValid locations: library,canteen,block-a,block-b,block-c,parking,hostel,ground,admin-block,other`
      }
    ];

    const raw = await groqClient.chat.completions.create({ model: MODEL, messages, response_format: { type: 'json_object' } });
    return parseGroqJSON(raw.choices[0].message.content);
  } catch (e) {
    console.error('parseNLSearch failed:', e.message);
    return null;
  }
}

module.exports = { enrichItem, parseNLSearch };
