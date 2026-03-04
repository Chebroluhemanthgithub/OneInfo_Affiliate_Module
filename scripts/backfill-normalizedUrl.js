/**
 * One-time migration: backfill `normalizedUrl` for any AffiliateLink records
 * that were created before the deduplication fix was applied.
 *
 * Run ONCE:
 *   node scripts/backfill-normalizedUrl.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const AffiliateLink = require("../src/links/affiliateLink.model");
const { normalizeUrl } = require("../src/utils/urlNormalizer");

(async () => {
  await connectDB();

  // Find all records where normalizedUrl is missing / empty
  const docs = await AffiliateLink.find({
    $or: [
      { normalizedUrl: { $exists: false } },
      { normalizedUrl: null },
      { normalizedUrl: "" },
    ],
  }).lean();

  console.log(`Found ${docs.length} records missing normalizedUrl.`);

  let updated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const computed = normalizeUrl(doc.originalUrl || "");
    if (!computed) { skipped++; continue; }

    await AffiliateLink.updateOne(
      { _id: doc._id },
      { $set: { normalizedUrl: computed } }
    );
    updated++;
  }

  console.log(`Backfill complete. Updated: ${updated}, Skipped (bad URL): ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
})();
