const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Brand = require('../src/brands/brand.model');

async function exportBrands() {
  try {
    console.log('Connecting to Database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    console.log('Fetching active Indian Cuelinks brands...');
    const brands = await Brand.find({
      networkId: 'cuelinks',
      status: 'active',
      networkStatus: 'active',
      $or: [
        { countries: 'IN' },
        { domain: /\.in$/i },
        { name: /India/i }
      ]
    })
    .select('name domain')
    .sort({ name: 1 })
    .lean();

    console.log(`Found ${brands.length} brands. Generating CSV...`);

    const csvRows = ['S.NO,CAMPAIGN NAME,Domain name'];
    brands.forEach((b, index) => {
      // Escape commas in brand names just in case
      const safeName = b.name.replace(/,/g, '');
      csvRows.push(`${index + 1},${safeName},${b.domain}`);
    });

    const csvContent = csvRows.join('\n');
    const outputPath = path.resolve(__dirname, '../cuelinks_indian_brands.csv');
    fs.writeFileSync(outputPath, csvContent);

    console.log(`\nSuccess! Full list exported to: ${outputPath}`);
    console.log(`Total Brands: ${brands.length}`);

    process.exit(0);
  } catch (err) {
    console.error('Export failed:', err.message);
    process.exit(1);
  }
}

exportBrands();
