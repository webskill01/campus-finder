'use strict';
/**
 * One-time script: deletes all test posts from MongoDB + Cloudinary
 * KEEPS only the 7 real/reserved posts specified by the user.
 *
 * Run from repo root: node server/scripts/cleanup-test-posts.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const Item = require('../models/Item');

// Keywords (case-insensitive). A post is KEPT if its title matches ANY of these.
const KEEP_PATTERNS = [
  /realme\s+earphones/i,
  /bluetooth\s+speaker/i,
  /realme\s+white\s+tws/i,
  /reserved/i,
];

function shouldKeep(title = '') {
  return KEEP_PATTERNS.some(p => p.test(title));
}

async function main() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const all = await Item.find({}).select('_id title image').lean();
  console.log(`Total items in DB: ${all.length}`);

  const toDelete = all.filter(item => !shouldKeep(item.title));
  const toKeep   = all.filter(item =>  shouldKeep(item.title));

  console.log(`\nKEEPING (${toKeep.length}):`);
  toKeep.forEach(i => console.log(`  ✓ ${i.title}`));

  console.log(`\nDELETING (${toDelete.length}):`);
  toDelete.forEach(i => console.log(`  ✗ ${i.title}`));

  if (toDelete.length === 0) {
    console.log('\nNothing to delete.');
    await mongoose.disconnect();
    return;
  }

  let cloudinaryDeleted = 0;
  let cloudinaryFailed  = 0;

  for (const item of toDelete) {
    // Delete Cloudinary image if present
    if (item.image?.publicId) {
      try {
        await cloudinary.uploader.destroy(item.image.publicId);
        cloudinaryDeleted++;
      } catch (err) {
        console.warn(`  Cloudinary delete failed for ${item.title}: ${err.message}`);
        cloudinaryFailed++;
      }
    }

    // Remove stale topMatches references in other items
    await Item.updateMany(
      { 'topMatches.itemId': item._id },
      { $pull: { topMatches: { itemId: item._id } } }
    );

    // Delete the item
    await Item.findByIdAndDelete(item._id);
    console.log(`  Deleted: ${item.title}`);
  }

  console.log(`\nDone. Deleted ${toDelete.length} items.`);
  console.log(`Cloudinary images removed: ${cloudinaryDeleted}, failed: ${cloudinaryFailed}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
