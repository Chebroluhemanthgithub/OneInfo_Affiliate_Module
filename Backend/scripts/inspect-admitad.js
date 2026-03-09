require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: true });
const admitadService = require('../src/services/affiliate/admitad.service');

async function inspect() {
  try {
    const campaigns = await admitadService.getCampaigns(true); // active only
    if (campaigns && campaigns.length > 0) {
      const fs = require('fs');
      fs.writeFileSync('admitad_sample.json', JSON.stringify(campaigns[0], null, 2));
      console.log('Sample written to admitad_sample.json');
    } else {
      console.log('No campaigns found.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}


inspect();
