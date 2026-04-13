/**
 * Quick one-time script to insert a test resolved item so the
 * ResolvedStrip renders in the frontend.
 * Run: node server/seed-resolved.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item = require('./models/Item');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await Item.findOne({ status: 'resolved' });
  if (existing) {
    console.log('A resolved item already exists:', existing.title);
    await mongoose.disconnect();
    return;
  }

  const item = await Item.create({
    type: 'found',
    status: 'resolved',
    title: 'Blue Nike Backpack',
    category: 'bag',
    location: 'Library',
    description: 'Blue Nike backpack with laptop compartment found near reading section.',
    itemDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    resolvedAt: new Date(Date.now() - 30 * 60 * 1000),         // 30 min ago
    posterGmail: 'test@college.edu',
    posterRollNo: 'TEST001',
    manageToken: 'seed-manage-token-' + Date.now(),
  });

  console.log('Created resolved item:', item.title, '(id:', item._id + ')');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
