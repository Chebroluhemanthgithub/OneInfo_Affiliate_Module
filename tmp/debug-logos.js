const mongoose = require('mongoose');
require('dotenv').config();
const Brand = require('./src/brands/brand.model');

async function debugBrands() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const brands = await Brand.find({ _id: { $in: ['brand_lifestyle', 'brand_plum'] } });
    brands.forEach(b => {
      console.log(`ID: ${b._id}`);
      console.log(`Name: ${b.name}`);
      console.log(`Logo: ${b.logoUrl}`);
      console.log('---');
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
debugBrands();
