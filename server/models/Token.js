const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  gmail: { type: String, required: true, unique: true },
  rollNo: { type: String, required: true },
  name: { type: String, default: '', maxlength: 60, trim: true },
  dob: String,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  },
  postCount: { type: Number, default: 0 },
  lastPostDate: Date
});

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Token', tokenSchema);
