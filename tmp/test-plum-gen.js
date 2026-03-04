require("dotenv").config();
const mongoose = require("mongoose");
const { getServiceByKey } = require("../src/services/affiliate/networkFactory");
const Brand = require("../src/brands/brand.model");

async function test() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/affiliate_db";
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const originalUrl = "https://plumgoodness.com/products/plum-bodylovin-beach-please-body-mist";
    const shortCode = "PLUM01";

    // Test Cuelinks for Plum Goodness
    console.log("\n--- Testing Cuelinks (Plum Goodness) ---");
    const plumBrand = await Brand.findOne({ name: /plum/i });
    if (plumBrand) {
      console.log("Found brand:", plumBrand.name, "ID:", plumBrand._id, "Campaign ID:", plumBrand.networkCampaignId);
      const cuelinksService = getServiceByKey("cuelinks");
      try {
        const link = cuelinksService.generateBaseLink(originalUrl, shortCode, plumBrand);
        console.log("Generated Link:", link);
        if (link.includes("cid=267881") && link.includes("subid=PLUM01")) {
          console.log("✅ Cuelinks link correctly includes CID and subid");
        } else {
          console.error("❌ Cuelinks link missing parameters");
        }
      } catch (err) {
        console.error("❌ Link generation failed:", err.message);
      }
    } else {
      console.error("❌ Plum brand not found in DB even after seeding!");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Test Error:", err);
  }
}

test();
