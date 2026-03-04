require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

const BASE = process.env.BASE_URL || 'http://localhost:4000';

async function run() {
  try {
    const tRes = await fetch(`${BASE}/dev/token/creator123`);
    const tJson = await tRes.json();
    const token = tJson.token;
    console.log('Token:', token);

    const body = {
      originalUrl: 'https://plumgoodness.com/products/green-tea-pore-cleansing-face-wash',
      brandId: 'brand_plum'
    };

    const res = await fetch(`${BASE}/links/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('Create response:', res.status, data);
  } catch (err) {
    console.error('Test error:', err.message || err);
    process.exit(1);
  }
}

run();
