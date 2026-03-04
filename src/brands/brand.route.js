const express = require('express');
const router = express.Router();
const Brand = require('./brand.model');

// Public: list active brands (minimal fields)
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find({ status: 'active' })
      .select('_id name networkId networkCampaignId domain logoUrl')
      .lean();
    res.json(brands);
  } catch (err) {
    console.error('Brands list error', err.message);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

module.exports = router;
