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

    const targetUrl = 'https://www.ajio.com/men-sneakers-casual-shoes-sale/c/830303001';
    const domain = 'ajio.com';

    const brand = await Brand.findOne({
      networkId: 'cuelinks',
      status: 'active',
      networkStatus: 'active',
      $or: [{ domain: domain }, { domains: domain }]
    }).lean();

    if (!brand) {
      console.error('Brand Ajio not found or not active in DB');
      process.exit(1);
    }

    console.log(`Found Brand: ${brand.name} (CID: ${brand.networkCampaignId})`);

    const shortCode = 'TEST123';
    const creatorId = 'admin_test';

    const base = cuelinksService.generateBaseLink(targetUrl, shortCode, brand);
    
    // buildAffiliateUrl({ platform, baseUrl, creatorId, shortCode })
    const finalUrl = buildAffiliateUrl({
      platform: 'cuelinks',
      baseUrl: base,
      creatorId,
      shortCode
    });

    console.log('\n--- TEST RESULTS ---');
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
