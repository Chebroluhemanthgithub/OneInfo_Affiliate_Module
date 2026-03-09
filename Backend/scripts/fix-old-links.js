const mongoose = require("mongoose");
require("dotenv").config();
const AffiliateLink = require("../src/links/affiliateLink.model");

async function fixExistingLinks() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    const links = await AffiliateLink.find({
      affiliateUrl: { $regex: /subid=/ },
    });

    console.log(`Found ${links.length} links needing parameter rename.`);

    let updatedCount = 0;
    for (const link of links) {
      if (link.affiliateUrl.includes("subid=")) {
        // Replace subid= with subid1=
        // Note: We use a simple replace because subid is our own param we added
        const newUrl = link.affiliateUrl.replace(/([?&])subid=/, "$1subid1=");
        
        await AffiliateLink.updateOne(
          { _id: link._id },
          { $set: { affiliateUrl: newUrl } }
        );
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} links.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

fixExistingLinks();
