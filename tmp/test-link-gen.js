require("dotenv").config();
const { getServiceByKey } = require("../src/services/affiliate/networkFactory");
const Brand = require("../src/brands/brand.model");
const mongoose = require("mongoose");

async function test() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/affiliate_db";
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const originalUrl = "https://www.lifestylestores.com/p/12345";
    const shortCode = "TEST01";

    // 1. Test Admitad (Default)
    console.log("\n--- Testing Admitad ---");
    const admitadService = getServiceByKey("admitad");
    const admitadLink = admitadService.generateBaseLink(originalUrl, shortCode);
    console.log("Admitad Base Link:", admitadLink);
    if (admitadLink.includes("ulp=") && admitadLink.includes("subid=")) {
      console.log("✅ Admitad link looks good");
    } else {
      console.error("❌ Admitad link missing parameters");
    }

    // 2. Test Cuelinks
    console.log("\n--- Testing Cuelinks ---");
    const cuelinkBrand = await Brand.findOne({ networkId: { $ne: null } }); 
    if (cuelinkBrand) {
      console.log("Found brand:", cuelinkBrand.name, "Campaign ID:", cuelinkBrand.networkCampaignId);
      const cuelinksService = getServiceByKey("cuelinks");
      try {
        const cuelink = cuelinksService.generateBaseLink(originalUrl, shortCode, cuelinkBrand);
        console.log("Cuelinks Base Link:", cuelink);
        if (cuelink.includes("cid=") && cuelink.includes("url=")) {
          console.log("✅ Cuelinks link looks good");
        } else {
          console.error("❌ Cuelinks link missing parameters");
        }
      } catch (err) {
        console.error("❌ Cuelinks generation failed:", err.message);
      }
    } else {
      console.log("Skipping Cuelinks test: No Cuelinks brand found in DB");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Test Error:", err);
  }
}

test();
