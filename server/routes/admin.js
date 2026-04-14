'use strict';
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { v2: cloudinary } = require('cloudinary');
const Item = require('../models/Item');

const router = express.Router();

// HMAC-based session: cookie stores a hash, never the raw password
function makeAdminSession(password) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'admin-session-secret')
    .update(password)
    .digest('hex');
}

function adminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || req.cookies.adminToken !== makeAdminSession(adminPassword)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  res.cookie('adminToken', makeAdminSession(process.env.ADMIN_PASSWORD), {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ message: 'Logged in' });
});

// GET /api/admin/items
router.get('/items', adminAuth, async (req, res) => {
  try {
    const { type, status, category, page = 1 } = req.query;
    const filter = {};
    if (type && ['lost', 'found'].includes(type)) filter.type = type;
    if (status && ['active', 'resolved', 'expired'].includes(status)) filter.status = status;
    if (category && category !== 'all') filter.category = category;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = 20;
    const skip = (pageNum - 1) * limit;

    const [items, total] = await Promise.all([
      Item.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v').lean(),
      Item.countDocuments(filter)
    ]);

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Admin items error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/items/:id
router.delete('/items/:id', adminAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (item.image && item.image.publicId) {
      try {
        await cloudinary.uploader.destroy(item.image.publicId);
      } catch (cloudErr) {
        console.error('Cloudinary delete failed:', cloudErr.message);
      }
    }

    await Item.findByIdAndDelete(req.params.id);
    await Item.updateMany(
      { 'topMatches.itemId': item._id },
      { $pull: { topMatches: { itemId: item._id } } }
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Admin delete error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // Single aggregation pass instead of 4 countDocuments round trips
    const result = await Item.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const counts = { active: 0, resolved: 0, expired: 0, total: 0 };
    result.forEach(({ _id, count }) => {
      if (_id in counts) counts[_id] = count;
      counts.total += count;
    });
    res.json(counts);
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
