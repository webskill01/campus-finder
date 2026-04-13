const express = require('express');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const crypto = require('crypto');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const auth = require('../middleware/auth');
const Token = require('../models/Token');
const { extractTags } = require('../services/tagger');
const { sendManageEmail, sendInterestEmail } = require('../services/mailer');
const { enrichItem, parseNLSearch } = require('../services/groq');
const { searchLim } = require('../middleware/rateLimit');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /api/items — list items with filters, sort, pagination
router.get('/', async (req, res) => {
  try {
    const {
      type,
      category,
      status = 'active',
      page = 1,
      sort = 'recent',
      dateRange = 'all'
    } = req.query;

    const filter = { status };
    if (type && ['lost', 'found'].includes(type)) filter.type = type;
    if (category && category !== 'all') filter.category = category;

    // Date range filter
    if (dateRange === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (dateRange === 'week') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      filter.createdAt = { $gte: start };
    }

    // Sort options
    const sortMap = {
      recent: { createdAt: -1 },
      old: { createdAt: 1 },
      az: { title: 1 },
      match: { 'topMatches.0.score': -1, createdAt: -1 }
    };
    const sortOption = sortMap[sort] || sortMap.recent;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (pageNum - 1) * limit;

    const [items, total] = await Promise.all([
      Item.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      Item.countDocuments(filter)
    ]);

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Items list error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/items/search — text search or AI-parsed search (ai=true)
router.get('/search', searchLim, async (req, res) => {
  try {
    const { q, type, ai } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (ai === 'true') {
      const filters = await parseNLSearch(q.trim());
      if (filters) {
        const filter = { status: 'active' };

        // Type: prefer explicit query param, fall back to AI-extracted
        const itemType = (type && ['lost', 'found'].includes(type))
          ? type
          : (filters.type && ['lost', 'found'].includes(filters.type) ? filters.type : null);
        if (itemType) filter.type = itemType;

        // Category (validate against enum)
        const validCats = ['phone', 'keys', 'bag', 'documents', 'electronics', 'accessories', 'clothing', 'other'];
        if (filters.category && validCats.includes(filters.category)) {
          filter.category = filters.category;
        }

        // Location (validate against enum)
        const validLocs = ['library', 'canteen', 'block-a', 'block-b', 'block-c', 'parking', 'hostel', 'ground', 'admin-block', 'other'];
        if (filters.location && validLocs.includes(filters.location)) {
          filter.location = filters.location;
        }

        // dateHint → itemDate range
        if (filters.dateHint === 'today') {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          filter.itemDate = { $gte: start };
        } else if (filters.dateHint === 'week') {
          filter.itemDate = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
        }

        // Keywords → $text search
        const hasKeywords = Array.isArray(filters.keywords) && filters.keywords.length > 0;
        let items;
        if (hasKeywords) {
          filter.$text = { $search: filters.keywords.join(' ') };
          items = await Item.find(filter, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .limit(20)
            .select('-__v')
            .lean();
        } else {
          items = await Item.find(filter)
            .sort({ createdAt: -1 })
            .limit(20)
            .select('-__v')
            .lean();
        }

        return res.json({ items, total: items.length, aiFilters: filters });
      }
      // parseNLSearch returned null → fall through to $text search
    }

    // Default: MongoDB $text search
    const filter = { status: 'active', $text: { $search: q.trim() } };
    if (type && ['lost', 'found'].includes(type)) filter.type = type;

    const items = await Item.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .select('-__v')
      .lean();

    res.json({ items, total: items.length });
  } catch (err) {
    console.error('Items search error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/items/resolved — recently resolved items (last 48h)
router.get('/resolved', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const items = await Item.find({
      status: 'resolved',
      resolvedAt: { $gte: cutoff }
    })
      .sort({ resolvedAt: -1 })
      .limit(10)
      .select('title category location type resolvedAt')
      .lean();

    res.json({ items });
  } catch (err) {
    console.error('Resolved items error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/items/manage/:token — fetch item by manage token (for Manage page)
router.get('/manage/:token', async (req, res) => {
  try {
    const item = await Item.findOne({ manageToken: req.params.token })
      .select('-__v')
      .lean();
    if (!item) return res.status(404).json({ error: 'Item not found or invalid token' });
    res.json(item);
  } catch (err) {
    console.error('Manage token lookup error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/items/:id — single item with populated topMatches
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = await Item.findById(req.params.id)
      .populate('topMatches.itemId', 'title category location type image dominantColor')
      .select('-__v')
      .lean();

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (err) {
    console.error('Item detail error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/items — create new item (auth required)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { gmail, rollNo } = req.user;

    // Rate limit: max 3 posts per day
    const tokenDoc = await Token.findOne({ gmail });
    if (tokenDoc) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (tokenDoc.lastPostDate && tokenDoc.lastPostDate >= today && tokenDoc.postCount >= 3) {
        return res.status(429).json({ error: 'Maximum 3 posts per day' });
      }
    }

    // Validate required fields
    const { title, category, location, description, itemDate, type } = req.body;
    if (!title || !category || !location || !description || !itemDate || !type) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['lost', 'found'].includes(type)) {
      return res.status(400).json({ error: 'type must be "lost" or "found"' });
    }

    // Sanitize text inputs
    const cleanTitle = title.trim().slice(0, 100);
    const cleanDesc = description.trim().slice(0, 500);

    // Run tagger sync
    const tags = extractTags(cleanTitle, cleanDesc);

    // Generate manage token
    const manageToken = crypto.randomBytes(32).toString('hex');

    // Build item data
    const itemData = {
      type,
      title: cleanTitle,
      category,
      location,
      description: cleanDesc,
      itemDate: new Date(itemDate),
      posterGmail: gmail,
      posterRollNo: rollNo,
      manageToken,
      dominantColor: req.body.dominantColor || null,
      enriched: {
        color: tags.colors[0] || null,
        brand: tags.brands[0] || null,
        keywords: [...tags.colors, ...tags.brands]
      }
    };

    // Upload image to Cloudinary if provided
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'campusfinder', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      itemData.image = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id
      };
    }

    const item = await Item.create(itemData);

    // Non-blocking: enrich item with Groq, then re-run matching with enriched data
    setImmediate(() =>
      enrichItem(item.toObject()).catch(err =>
        console.error('Enrich error:', err.message)
      )
    );

    // Update post count — reset if new day, otherwise increment
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (tokenDoc && tokenDoc.lastPostDate && tokenDoc.lastPostDate < today) {
      await Token.findOneAndUpdate({ gmail }, { postCount: 1, lastPostDate: new Date() });
    } else {
      await Token.findOneAndUpdate({ gmail }, { $inc: { postCount: 1 }, lastPostDate: new Date() });
    }

    // Send manage email async (fire-and-forget)
    sendManageEmail({ to: gmail, title: cleanTitle, manageToken });

    res.status(201).json({
      item: {
        _id: item._id,
        title: item.title,
        type: item.type,
        category: item.category,
        manageToken: item.manageToken
      }
    });
  } catch (err) {
    console.error('Item create error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/items/:id — update item (manage token required)
router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const manageToken = req.headers['x-manage-token'];
    if (!manageToken) {
      return res.status(401).json({ error: 'Manage token required' });
    }

    const item = await Item.findOne({ _id: req.params.id, manageToken });
    if (!item) {
      return res.status(404).json({ error: 'Item not found or invalid token' });
    }

    // Only allow updating specific fields
    const allowed = ['title', 'description', 'category', 'location', 'itemDate'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        if (field === 'title') updates[field] = req.body[field].trim().slice(0, 100);
        else if (field === 'description') updates[field] = req.body[field].trim().slice(0, 500);
        else updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Re-run tagger if title or description changed
    if (updates.title || updates.description) {
      const tags = extractTags(
        updates.title || item.title,
        updates.description || item.description
      );
      updates['enriched.color'] = tags.colors[0] || item.enriched?.color || null;
      updates['enriched.brand'] = tags.brands[0] || item.enriched?.brand || null;
      updates['enriched.keywords'] = [...tags.colors, ...tags.brands];
    }

    const updated = await Item.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('-__v')
      .lean();

    res.json(updated);
  } catch (err) {
    console.error('Item update error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/items/:id/resolve — mark item as resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const manageToken = req.headers['x-manage-token'];
    if (!manageToken) {
      return res.status(401).json({ error: 'Manage token required' });
    }

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, manageToken, status: 'active' },
      { status: 'resolved', resolvedAt: new Date() },
      { new: true }
    ).select('-__v').lean();

    if (!item) {
      return res.status(404).json({ error: 'Item not found, invalid token, or already resolved' });
    }

    res.json(item);
  } catch (err) {
    console.error('Item resolve error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/items/:id — delete item + Cloudinary image
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const manageToken = req.headers['x-manage-token'];
    if (!manageToken) {
      return res.status(401).json({ error: 'Manage token required' });
    }

    const item = await Item.findOne({ _id: req.params.id, manageToken });
    if (!item) {
      return res.status(404).json({ error: 'Item not found or invalid token' });
    }

    // Delete Cloudinary image if exists
    if (item.image && item.image.publicId) {
      try {
        await cloudinary.uploader.destroy(item.image.publicId);
      } catch (cloudErr) {
        console.error('Cloudinary delete failed:', cloudErr.message);
      }
    }

    await Item.findByIdAndDelete(req.params.id);

    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Item delete error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/items/:id/interest — notify poster (auth required)
router.post('/:id/interest', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const item = await Item.findOne({ _id: req.params.id, status: 'active' });
    if (!item) return res.status(404).json({ error: 'Item not found or not active' });

    if (item.posterGmail === req.user.gmail) {
      return res.status(400).json({ error: 'Cannot express interest in your own post' });
    }

    const message = typeof req.body.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
    await sendInterestEmail({
      to: item.posterGmail,
      title: item.title,
      interestedGmail: req.user.gmail,
      message
    });

    res.json({ message: 'Interest sent' });
  } catch (err) {
    console.error('Interest route error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
