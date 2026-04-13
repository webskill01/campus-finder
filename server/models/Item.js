const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['lost', 'found'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'expired'],
    default: 'active'
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['phone', 'keys', 'bag', 'documents', 'electronics', 'accessories', 'clothing', 'wallet', 'bottle', 'glasses', 'headphones', 'id-card', 'stationery', 'other'],
    required: true
  },
  location: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  itemDate: {
    type: Date,
    required: true
  },
  posterGmail: {
    type: String,
    required: true
  },
  posterRollNo: {
    type: String,
    required: true
  },
  manageToken: {
    type: String,
    required: true,
    unique: true
  },
  image: {
    url: String,
    publicId: String
  },
  dominantColor: String,
  enriched: {
    cleanDescription: String,
    keywords: [String],
    color: String,
    brand: String,
    iconName: String,
    enrichedAt: Date
  },
  topMatches: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    },
    score: Number,
    signals: [String]
  }],
  resolvedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

itemSchema.index({ title: 'text', description: 'text' });
itemSchema.index({ status: 1, type: 1, category: 1 });
itemSchema.index({ expiresAt: 1 });
itemSchema.index({ status: 1, type: 1, createdAt: -1 });
itemSchema.index({ status: 1, type: 1, category: 1, createdAt: -1 });
itemSchema.index({ status: 1, resolvedAt: -1 });
itemSchema.index({ posterGmail: 1, createdAt: -1 });

module.exports = mongoose.model('Item', itemSchema);
