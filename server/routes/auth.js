const express = require('express');
const jwt = require('jsonwebtoken');
const Token = require('../models/Token');
const auth = require('../middleware/auth');

const router = express.Router();

const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function dobError(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 'Invalid date of birth';
  const now = new Date();
  if (birth > now) return 'Date of birth cannot be in the future';
  const age = (now - birth) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 14) return 'You must be at least 14 years old to use CampusFinder';
  return null;
}

function makeJwt(doc) {
  return jwt.sign(
    { gmail: doc.gmail, rollNo: doc.rollNo, name: doc.name || '' },
    process.env.JWT_SECRET,
    { expiresIn: '14d' }
  );
}

// POST /api/auth/verify — upsert token doc, return JWT
router.post('/verify', async (req, res) => {
  try {
    const { gmail, rollNo, dob, name } = req.body;

    if (!gmail || !rollNo) {
      return res.status(400).json({ error: 'gmail and rollNo are required' });
    }
    if (!GMAIL_RE.test(gmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const cleanGmail = gmail.trim().toLowerCase();
    const cleanRollNo = rollNo.trim();
    const cleanName = (name || '').trim().slice(0, 60);

    if (cleanRollNo.length < 2 || cleanRollNo.length > 20) {
      return res.status(400).json({ error: 'Roll number must be 2–20 characters' });
    }

    const dobErr = dobError(dob);
    if (dobErr) return res.status(400).json({ error: dobErr });

    const tokenDoc = await Token.findOneAndUpdate(
      { gmail: cleanGmail },
      {
        gmail: cleanGmail,
        rollNo: cleanRollNo,
        name: cleanName,
        dob: dob || undefined,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = makeJwt(tokenDoc);
    res.json({ token, gmail: tokenDoc.gmail, rollNo: tokenDoc.rollNo, name: tokenDoc.name });
  } catch (err) {
    console.error('Auth verify error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me — return current user from JWT
router.get('/me', auth, (req, res) => {
  res.json({ gmail: req.user.gmail, rollNo: req.user.rollNo, name: req.user.name });
});

// PATCH /api/auth/profile — update name, rollNo, gmail (auth required)
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, rollNo, gmail } = req.body;
    const updates = {};

    if (name !== undefined) {
      const cleanName = String(name).trim().slice(0, 60);
      updates.name = cleanName;
    }
    if (rollNo !== undefined) {
      const cleanRollNo = String(rollNo).trim();
      if (cleanRollNo.length < 2 || cleanRollNo.length > 20) {
        return res.status(400).json({ error: 'Roll number must be 2–20 characters' });
      }
      updates.rollNo = cleanRollNo;
    }
    if (gmail !== undefined) {
      const cleanGmail = String(gmail).trim().toLowerCase();
      if (!GMAIL_RE.test(cleanGmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      if (cleanGmail !== req.user.gmail) {
        const existing = await Token.findOne({ gmail: cleanGmail });
        if (existing) return res.status(409).json({ error: 'That email is already in use' });
      }
      updates.gmail = cleanGmail;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updated = await Token.findOneAndUpdate(
      { gmail: req.user.gmail },
      updates,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Profile not found' });

    const token = makeJwt(updated);
    res.json({ token, gmail: updated.gmail, rollNo: updated.rollNo, name: updated.name });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'That email is already in use' });
    }
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
