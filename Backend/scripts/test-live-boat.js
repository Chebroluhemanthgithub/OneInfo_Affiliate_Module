const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Brand = require('../src/brands/brand.model');
const cuelinksService = require('../src/services/affiliate/cuelinks.service');
const { buildAffiliateUrl } = require('../src/affiliate/affiliate.service');

async function testLink() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB Connected.');

    const targetUrl = 'https://www.boat-lifestyle.com/products/airdopes-161';
    const domain = 'boat-lifestyle.com';

    const brand = await Brand.findOne({
      networkId: 'cuelinks',
      status: 'active',
      networkStatus: 'active',
      $or: [{ domain: domain }, { domains: domain }]
    }).lean();

    if (!brand) {
      console.error('Brand Boat not found or not active in DB');
      process.exit(1);
    }

    console.log(`Found Brand: ${brand.name} (CID: ${brand.networkCampaignId})`);

    const shortCode = 'BOAT789';
    const creatorId = 'admin_test';

    const base = cuelinksService.generateBaseLink(targetUrl, shortCode, brand);
    const finalUrl = buildAffiliateUrl({
      platform: 'cuelinks',
      baseUrl: base,
      creatorId,
      shortCode
    });

    console.log('\n--- TEST RESULTS (BOAT) ---');
    console.log(`Input URL: ${targetUrl}`);
    console.log(`Generated Tracking URL: ${finalUrl}`);
    console.log('---------------------\n');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testLink();
