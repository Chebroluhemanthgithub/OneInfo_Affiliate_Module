require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: true });
const cuelinksService = require('../src/services/affiliate/cuelinks.service');

async function inspect() {
  try {
    const apiKey = process.env.CUELINKS_API_KEY || process.env.CUELINKS_TOKEN;
    const url = `https://cuelinks.com/api/v2/campaigns.json?page=1`;
    const _fetch = require('node-fetch');
    const res = await _fetch(url, {
      headers: {
        Authorization: `Token token="${apiKey.trim()}"`,
        Accept: "application/json",
      },
    });
    const data = await res.json();
    if (data && data.campaigns && data.campaigns.length > 0) {
      const fs = require('fs');
      fs.writeFileSync('cuelinks_sample.json', JSON.stringify(data.campaigns[0], null, 2));
      console.log('Sample written to cuelinks_sample.json');
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
