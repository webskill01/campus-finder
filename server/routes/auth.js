const express = require('express');
const jwt = require('jsonwebtoken');
const Token = require('../models/Token');
const auth = require('../middleware/auth');

const router = express.Router();

const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function dobError(dob) {
  if (!dob) return 'Date of birth is required';
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

// GET /api/auth/check — check if an email has an existing account
router.get('/check', async (req, res) => {
  try {
    const { gmail } = req.query;
    if (!gmail || !GMAIL_RE.test(gmail.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const exists = await Token.exists({ gmail: gmail.trim().toLowerCase() });
    res.json({ exists: !!exists });
  } catch (err) {
    console.error('Auth check error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/verify — login (email+rollNo) or signup (all 4 fields)
router.post('/verify', async (req, res) => {
  try {
    const { gmail, rollNo, dob, name } = req.body;

    if (!gmail || !rollNo) {
      return res.status(400).json({ error: 'Email and roll number are required' });
    }
    if (!GMAIL_RE.test(gmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const cleanGmail = gmail.trim().toLowerCase();
    const cleanRollNo = rollNo.trim();

    if (cleanRollNo.length < 2 || cleanRollNo.length > 20) {
      return res.status(400).json({ error: 'Roll number must be 2–20 characters' });
    }

    // Check if account already exists
    const existing = await Token.findOne({ gmail: cleanGmail });

    if (existing) {
      // LOGIN path: verify rollNo matches (case-insensitive)
      if (existing.rollNo.toLowerCase() !== cleanRollNo.toLowerCase()) {
        return res.status(401).json({ error: 'Roll number does not match our records' });
      }
      // Refresh token expiry and return JWT
      existing.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await existing.save();
      const token = makeJwt(existing);
      return res.json({ token, gmail: existing.gmail, rollNo: existing.rollNo, name: existing.name });
    }

    // SIGNUP path: require name and dob for new accounts
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required to create an account', needsSignup: true });
    }
    const dobErr = dobError(dob);
    if (dobErr) return res.status(400).json({ error: dobErr, needsSignup: true });

    const cleanName = name.trim().slice(0, 60);

    const tokenDoc = await Token.create({
      gmail: cleanGmail,
      rollNo: cleanRollNo,
      name: cleanName,
      dob,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    const token = makeJwt(tokenDoc);
    res.json({ token, gmail: tokenDoc.gmail, rollNo: tokenDoc.rollNo, name: tokenDoc.name });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
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
