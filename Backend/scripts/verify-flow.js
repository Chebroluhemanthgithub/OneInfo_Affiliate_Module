require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: true });
const mongoose = require('mongoose');
const Brand = require('../src/brands/brand.model');
const AffiliateLink = require('../src/links/affiliateLink.model');

// We'll mock a request to the /links/create logic or just call the validation function
const { normalizeUrl } = require('../src/utils/urlNormalizer');

async function testValidation(url) {
  console.log(`\nTesting URL: ${url}`);
  
  // 1. Normalize
  const normalized = normalizeUrl(url);
  const parsed = new URL(normalized);
  let domain = parsed.hostname.toLowerCase();
  if (domain.startsWith("www.")) {
    domain = domain.substring(4);
  }

  // 2. Lookup Brand
  const brand = await Brand.findOne({
    status: "active",
    networkStatus: "active",
    $or: [{ domain: domain }, { domains: domain }]
  }).lean();

  if (brand) {
    console.log(`✅ SUCCESS: Found brand "${brand.name}" (${brand.networkId}) for domain "${domain}"`);
    return brand;
  } else {
    console.log(`❌ FAILURE: No active brand found for domain "${domain}"`);
    return null;
  }
}

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Test some known domains that SHOULD be in the DB after sync
    await testValidation("https://www.lifestylestores.com/in/en/p/12345");
    await testValidation("https://www.myntra.com/shoes/nike/123");
    await testValidation("https://www.ajio.com/men-sneakers/p/46123");
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
