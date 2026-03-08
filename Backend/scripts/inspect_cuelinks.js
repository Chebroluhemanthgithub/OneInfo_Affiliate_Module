const fetch = require('node-fetch');
async function run() {
  const r = await fetch('https://cuelinks.com/api/v2/campaigns.json?page=1', {
    headers: { Authorization: 'Token token="_MIFgmbHqvkgH2xRYALdDLD6v-yGsWvWOttbJrD2t_A"' }
  });
  const j = await r.json();
  console.log(JSON.stringify(j.campaigns[0], null, 2));
}
run();
