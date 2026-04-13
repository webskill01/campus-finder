'use strict';
const cron = require('node-cron');
const Item = require('../models/Item');
const Token = require('../models/Token');

const job = cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    const itemResult = await Item.updateMany(
      { status: 'active', expiresAt: { $lt: now } },
      { status: 'expired' }
    );
    const tokenResult = await Token.deleteMany({ expiresAt: { $lt: now } });
    console.log(`Expiry cron: ${itemResult.modifiedCount} items expired, ${tokenResult.deletedCount} tokens deleted`);
  } catch (err) {
    console.error('Expiry cron failed:', err.message);
  }
}, { scheduled: false });

module.exports = job;
