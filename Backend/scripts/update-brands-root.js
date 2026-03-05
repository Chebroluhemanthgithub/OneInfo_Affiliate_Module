const mongoose = require('mongoose');
require('dotenv').config();
const Brand = require('../src/brands/brand.model');

async function updateBrands() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not found in .env');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const updates = [
      {
        id: 'brand_lifestyle',
        domain: 'lifestylestores.com',
        logoUrl: 'https://vcdn.lifestylestores.com/storage/lifestyle/images/lifestyle-logo.png' 
      },
      {
        id: 'brand_plum',
        domain: 'plumgoodness.com',
        logoUrl: 'https://plumgoodness.com/cdn/shop/files/plum-logo-new_180x.png'
      }
    ];

    for (const update of updates) {
      const result = await Brand.findByIdAndUpdate(
        update.id,
        { domain: update.domain, logoUrl: update.logoUrl },
        { new: true }
      );
      if (result) {
        console.log(`Updated brand: ${result.name} (${result._id})`);
      } else {
        console.warn(`Brand not found: ${update.id}`);
      }
    }

    console.log('Update complete');
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

updateBrands();
