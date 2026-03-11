const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Brand = require('../src/brands/brand.model');
const cuelinksService = require('../src/services/affiliate/cuelinks.service');
const { buildAffiliateUrl } = require('../src/affiliate/affiliate.service');

async function runTests() {
  try {
    console.log('--- STARTING COMPREHENSIVE BACKEND VERIFICATION ---');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ DB Connected.\n');

    const testCases = [
      { name: 'Ajio (Standard)', url: 'https://www.ajio.com/p/123', domain: 'ajio.com' },
      { name: 'Boat (Subdomain/Different Domain)', url: 'https://www.boat-lifestyle.com/products/abc', domain: 'boat-lifestyle.com' },
      { name: 'Myntra (Popular)', url: 'https://www.myntra.com/shoes/xyz', domain: 'myntra.com' },
      { name: 'Adidas (.co.in)', url: 'https://www.adidas.co.in/sneakers/123', domain: 'adidas.co.in' },
      { name: 'Flipkart (Popular)', url: 'https://www.flipkart.com/mobiles/p/789', domain: 'flipkart.com' },
      { name: 'Unknown Brand (Fallback to Cuelinks)', url: 'https://www.randomshop.in/product/1', domain: 'randomshop.in' }
    ];

    let passed = 0;

    for (const test of testCases) {
      console.log(`Testing: ${test.name}`);
      
      const brand = await Brand.findOne({
        networkId: 'cuelinks',
        status: 'active',
        networkStatus: 'active',
        $or: [{ domain: test.domain }, { domains: test.domain }]
      }).lean();

      let platform = "cuelinks";
      let networkId = "cuelinks";
      let cid = "267881"; // Default/Sample CID

      if (brand) {
        console.log(`  ✅ Brand found in DB: ${brand.name} (CID: ${brand.networkCampaignId})`);
        cid = brand.networkCampaignId || cid;
      } else {
        console.log(`  ℹ️ Brand not found in DB. Falling back to default Cuelinks.`);
      }

      const shortCode = 'VERIFY123';
      const creatorId = 'admin_verify';

      // Simulate the logic in link.route.js
      const baseLink = cuelinksService.generateBaseLink(test.url, shortCode, brand || { networkCampaignId: cid });
      const finalUrl = buildAffiliateUrl({
        platform: 'cuelinks',
        baseUrl: baseLink,
        creatorId,
        shortCode
      });

      if (finalUrl.includes('linksredirect.com') && finalUrl.includes(`cid=${cid}`) && finalUrl.includes('subid1=VERIFY123')) {
        console.log(`  ✅ URL Generated correctly: ${finalUrl.substring(0, 80)}...`);
        passed++;
      } else {
        console.log(`  ❌ URL Generation FAILED.`);
        console.log(`  Result: ${finalUrl}`);
      }
      console.log('');
    }

    console.log(`--- RESULTS: ${passed}/${testCases.length} PASSED ---`);
    process.exit(passed === testCases.length ? 0 : 1);
  } catch (err) {
    console.error('❌ Verification failed with error:', err.message);
    process.exit(1);
  }
}

runTests();
