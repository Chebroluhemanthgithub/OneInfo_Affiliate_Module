require("dotenv").config();
const mongoose = require("mongoose");
const { getServiceByKey } = require("../src/services/affiliate/networkFactory");
const { buildAffiliateUrl } = require("../src/affiliate/affiliate.service");
const Brand = require("../src/brands/brand.model");

async function test() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/affiliate_db";
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const creatorId = "TEST_CREATOR_ID";
    const shortCode = "TRACK001";

    // 1. Test Cuelinks / Plum (Automatic Detection logic mockup)
    console.log("\n--- Testing Cuelinks / Plum (Tracking Params) ---");
    const plumBrand = await Brand.findOne({ name: /plum/i });
    if (plumBrand) {
      const cuelinksService = getServiceByKey("cuelinks");
      const base = cuelinksService.generateBaseLink("https://plumgoodness.com/p1", shortCode, plumBrand);
      
      const finalUrl = buildAffiliateUrl({
        platform: "cuelinks",
        baseUrl: base,
        creatorId,
        shortCode
      });

      console.log("Plum Final Affiliate URL:", finalUrl);
      
      const urlObj = new URL(finalUrl);
      const subid = urlObj.searchParams.get("subid");
      const subid1 = urlObj.searchParams.get("subid1");

      console.log("subid (creatorId?):", subid);
      console.log("subid1 (shortCode?):", subid1);

      if (subid === creatorId && subid1 === shortCode) {
        console.log("✅ Tracking parameters correctly swapped! (subid=creatorId, subid1=shortCode)");
      } else {
        console.error("❌ Tracking parameters mapping failed.");
      }
    }

    // 2. Test Admitad / Default
    console.log("\n--- Testing Admitad ---");
    const admitadService = getServiceByKey("admitad");
    const admitadBase = admitadService.generateBaseLink("https://lifestylestores.com/p2", shortCode);
    const admitadFinal = buildAffiliateUrl({
        platform: "admitad",
        baseUrl: admitadBase,
        creatorId,
        shortCode
    });
    console.log("Admitad Final URL:", admitadFinal);
    if (admitadFinal.includes("subid=" + shortCode)) {
        console.log("✅ Admitad correctly uses subid for shortCode");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Test Error:", err);
  }
}

test();
