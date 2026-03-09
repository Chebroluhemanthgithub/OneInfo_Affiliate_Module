require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), override: true });
const _fetch = require('node-fetch');

async function search(name) {
  try {
    const apiKey = (process.env.CUELINKS_API_KEY || process.env.CUELINKS_TOKEN).trim();
    const url = `https://cuelinks.com/api/v2/campaigns.json?search=${encodeURIComponent(name)}`;
    const res = await _fetch(url, {
      headers: {
        Authorization: `Token token="${apiKey}"`,
        Accept: "application/json",
      },
    });
    const data = await res.json();
    console.log(`Results for "${name}":`, JSON.stringify(data.campaigns.map(c => ({
      name: c.name,
      id: c.id,
      domain: c.domain,
      status: c.status,
      affiliate_url: c.affiliate_url
    })), null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

search(process.argv[2] || 'Myntra');
