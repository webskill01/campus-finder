const express = require('express');
const jwt = require('jsonwebtoken');
const Token = require('../models/Token');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/verify — upsert token doc, return JWT
router.post('/verify', async (req, res) => {
  try {
    const { gmail, rollNo, dob } = req.body;

    if (!gmail || !rollNo) {
      return res.status(400).json({ error: 'gmail and rollNo are required' });
    }

    // Validate gmail format (basic)
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!gmailRegex.test(gmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Sanitize
    const cleanGmail = gmail.trim().toLowerCase();
    const cleanRollNo = rollNo.trim();

    if (cleanRollNo.length < 2 || cleanRollNo.length > 20) {
      return res.status(400).json({ error: 'Invalid roll number' });
    }

    // Upsert: create if not exists, update if exists
    const tokenDoc = await Token.findOneAndUpdate(
      { gmail: cleanGmail },
      {
        gmail: cleanGmail,
        rollNo: cleanRollNo,
        dob: dob || undefined,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const jwtToken = jwt.sign(
      { gmail: tokenDoc.gmail, rollNo: tokenDoc.rollNo },
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );

    res.json({ token: jwtToken, gmail: tokenDoc.gmail, rollNo: tokenDoc.rollNo });
  } catch (err) {
    console.error('Auth verify error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me — return current user from JWT
router.get('/me', auth, (req, res) => {
  res.json({ gmail: req.user.gmail, rollNo: req.user.rollNo });
});

module.exports = router;
