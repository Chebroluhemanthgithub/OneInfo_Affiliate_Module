/**
 * Run with: node scripts/seed_networks_brands.js
 * Creates sample `networks` and `brands` documents for Cuelinks/Plum
 */
require("dotenv").config();
const mongoose = require("mongoose");

const Network = require("../src/networks/network.model");
const Brand = require("../src/brands/brand.model");
const db = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL || "mongodb://localhost:27017/oneinfo";

async function run() {
  await mongoose.connect(db);

  // Upsert network: cuelinks
  await Network.updateOne(
    { _id: "network_cuelinks" },
    {
      _id: "network_cuelinks",
      key: "cuelinks",
      name: "Cuelinks",
      baseTrackingUrl: "https://linksredirect.com/",
      status: "active",
    },
    { upsert: true }
  );

  // Upsert brand: Plum
  await Brand.updateOne(
    { _id: "brand_plum" },
    {
      _id: "brand_plum",
      name: "Plum Goodness",
      networkId: "network_cuelinks",
      networkCampaignId: 267881,
      category: "Health & Beauty",
      cookieDays: 1,
      defaultCommission: 15,
      allowedTraffic: ["social", "text", "email"],
      status: "active",
    },
    { upsert: true }
  );

  console.log("Seed complete");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
