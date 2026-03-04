const mongoose = require('mongoose');
require('dotenv').config();
const Brand = require('./src/brands/brand.model');
const Network = require('./src/networks/network.model');

async function seedMissing() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Networks
    const networks = [
      {
        _id: 'admitad',
        name: 'Admitad',
        key: 'admitad',
        baseTrackingUrl: 'https://tjzuh.com/g/',
        status: 'active'
      },
      {
        _id: 'cuelinks',
        name: 'Cuelinks',
        key: 'cuelinks',
        baseTrackingUrl: 'https://linksredirect.com/api/transactions',
        status: 'active'
      }
    ];

    for (const n of networks) {
      await Network.findByIdAndUpdate(n._id, n, { upsert: true, new: true });
      console.log(`Network ${n.name} ensured.`);
    }

    // 2. Brands
    const brands = [
      {
        _id: 'brand_lifestyle',
        name: 'Lifestyle',
        networkId: 'admitad',
        networkCampaignId: 158440,
        domain: 'lifestylestores.com',
        logoUrl: 'https://vcdn.lifestylestores.com/storage/lifestyle/images/lifestyle-logo.png',
        status: 'active'
      },
      {
        _id: 'brand_plum',
        name: 'Plum Goodness',
        networkId: 'cuelinks',
        domain: 'plumgoodness.com',
        logoUrl: 'https://plumgoodness.com/cdn/shop/files/plum-logo-new_180x.png',
        status: 'active'
      }
    ];

    for (const b of brands) {
      const result = await Brand.findByIdAndUpdate(b._id, b, { upsert: true, new: true });
      console.log(`Brand ${result.name} ensured with domain ${result.domain}.`);
    }

    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedMissing();
