const fetch = require('node-fetch');

async function test() {
  const key = '_MIFgmbHqvkgH2xRYALdDLD6v-yGsWvWOttbJrD2t_A';
  
  const headersList = [
    { Authorization: `Token token="${key}"` },
    { Authorization: `Bearer ${key}` },
    { token: key },
    { 'X-Auth-Token': key }
  ];

  const urls = [
    'https://cuelinks.com/api/v2/campaigns.json',
    'https://api.cuelinks.com/v2/campaigns',
    'https://linksredirect.com/api/v3/campaigns.json'
  ];

  for(const url of urls) {
    for(const headers of headersList) {
      try {
        const r = await fetch(url, { headers });
        const t = await r.text();
        console.log(`URL: ${url} | Headers: ${JSON.stringify(headers)} | Status: ${r.status}`);
        if(r.status === 200 && t.includes('{')) {
          console.log('SUCCESS JSON:', t.slice(0, 100));
        }
      } catch (e) {
         console.log(`URL: ${url} failed: ${e.message}`);
      }
    }
  }
}
test();
