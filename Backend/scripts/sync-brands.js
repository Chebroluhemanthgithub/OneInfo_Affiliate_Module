require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: true });
const mongoose = require('mongoose');
const admitadService = require('../src/services/affiliate/admitad.service');
const cuelinksService = require('../src/services/affiliate/cuelinks.service');
const Brand = require('../src/brands/brand.model');

/**
 * Normalizes a URL to its base domain (removes www., path, etc.)
 */
function normalizeDomain(url) {
  if (!url) return null;
  try {
    let hostname = url;
    if (url.includes('://')) {
      hostname = new URL(url).hostname;
    }
    hostname = hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    return null;
  }
}

async function sync() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // 1. Sync Admitad Campaigns
    console.log('Fetching Admitad campaigns...');
    const admitadCampaigns = await admitadService.getCampaigns(false);
    console.log(`Found ${admitadCampaigns.length} Admitad campaigns.`);

    for (const item of admitadCampaigns) {
      const mainDomain = normalizeDomain(item.site_url || item.url);
      if (!mainDomain) continue;

      const brandUID = `admitad_${item.id}`;
      const update = {
        _id: brandUID,
        name: item.name,
        networkId: 'admitad',
        networkCampaignId: item.id,
        category: item.categories && item.categories[0] ? item.categories[0].name : 'general',
        domain: mainDomain,
        logoUrl: item.image || '',
        networkStatus: item.connection_status === 'active' || item.connected ? 'active' : 'inactive',
      };

      await Brand.updateOne(
        { _id: brandUID },
        { $set: update, $addToSet: { domains: mainDomain } },
        { upsert: true }
      );
    }
    console.log('Admitad sync completed.');

    // 2. Sync Cuelinks Campaigns
    console.log('Fetching Cuelinks campaigns...');
    const cuelinksCampaigns = await cuelinksService.getCampaigns();
    console.log(`Found ${cuelinksCampaigns.length} Cuelinks campaigns.`);

    for (const item of cuelinksCampaigns) {
      const mainDomain = normalizeDomain(item.url || item.domain);
      if (!mainDomain) continue;

      // CRITICAL: Extract CID from affiliate_url
      let cid = item.id;
      if (item.affiliate_url) {
        try {
          const urlObj = new URL(item.affiliate_url);
          const urlCid = urlObj.searchParams.get('cid');
          if (urlCid) cid = Number(urlCid);
        } catch (e) {
          // fallback to id
        }
      }

      const brandUID = `cuelinks_${item.id}`;
      // Cuelinks V2 usually returns campaigns available to you. 
      // If affiliate_url is present, we consider it 'active'.
      const isActive = !!item.affiliate_url;

      const update = {
        _id: brandUID,
        name: item.name,
        networkId: 'cuelinks',
        networkCampaignId: cid, // Use the extracted CID for tracking
        category: item.categories && item.categories[0] ? item.categories[0].name : 'general',
        domain: mainDomain,
        logoUrl: item.image || '',
        networkStatus: isActive ? 'active' : 'inactive',
      };

      await Brand.updateOne(
        { _id: brandUID },
        { $set: update, $addToSet: { domains: mainDomain } },
        { upsert: true }
      );
    }
    console.log('Cuelinks sync completed.');

    console.log('Sync finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err.message);
    process.exit(1);
  }
}

sync();
