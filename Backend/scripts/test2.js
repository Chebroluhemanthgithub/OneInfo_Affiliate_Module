const fetch = require('node-fetch');
require('dotenv').config({ path: '../.env' });

async function test() {
  const apiKey = process.env.CUELINKS_API_KEY.trim();
  console.log("Using API Key:", apiKey);
  const url = 'https://cuelinks.com/api/v2/campaigns.json';
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Token token="${apiKey}"`,
        Accept: 'application/json'
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response starts with:", text.slice(0, 100));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

test();
