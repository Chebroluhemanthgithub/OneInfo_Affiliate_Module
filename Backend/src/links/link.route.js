const express = require("express");
const router = express.Router();

const AffiliateLink = require("./affiliateLink.model");
const generateShortCode = require("../utils/shortCode");
const scrapeOG = require("../utils/scrapeOG");

const { buildAffiliateUrl } = require("../affiliate/affiliate.service");
const Brand = require("../brands/brand.model");
const Network = require("../networks/network.model");
const { getServiceByKey } = require("../services/affiliate/networkFactory");
const { normalizeUrl } = require("../utils/urlNormalizer");

/**
 * Validates the product URL by checking against the Brand collection in MongoDB.
 * Normalizes domain for better matching (removes 'www.').
 */
async function validateProductUrl(url) {
  // 1. Must be a valid URL
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "Invalid URL. Please paste a full product link (starting with https://).";
  }

  // 2. Must use https
  if (parsed.protocol !== "https:") {
    return "Only HTTPS links are supported.";
  }

  // 3. Normalize domain (remove www.)
  let domain = parsed.hostname.toLowerCase();
  if (domain.startsWith("www.")) {
    domain = domain.substring(4);
  }

  // 4. Find Brand in DB by domain or in domains array
  // We check if brand is status='active' AND networkStatus='active' (joined)
  const brand = await Brand.findOne({
    status: "active",
    networkStatus: "active",
    $or: [
      { domain: domain },
      { domains: domain }
    ]
  }).lean();

  if (!brand) {
    return `This brand is not currently active in our affiliate program.`;
  }

  return { brand }; // ✅ Success, return the brand for later use
}

// ─────────────────────────────────────────────
// POST /links/create
// Protected by JWT (authMiddleware injected in server.js)
// ─────────────────────────────────────────────
router.post("/create", async (req, res) => {
  try {
    const { originalUrl } = req.body;
    const creatorId = req.creatorId;

    // ── Input validation ──────────────────────
    if (!originalUrl) {
      return res.status(400).json({ error: "originalUrl is required" });
    }

    if (!creatorId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ── 1. Validate the URL and Find Brand ─────────────────────────
    let brand = null;
    let validationResult = await validateProductUrl(originalUrl);
    
    if (typeof validationResult === "string") {
      // If validation failed but a brandId was explicitly provided (admin/power-user flow), 
      // we allow it if the brand exists.
      if (req.body && req.body.brandId) {
        brand = await Brand.findById(req.body.brandId).lean();
        if (!brand) return res.status(400).json({ error: "Invalid brandId" });
      } else {
        return res.status(400).json({ error: validationResult });
      }
    } else {
      brand = validationResult.brand;
    }

    // ── 2. Normalize URL ───────────────────────
    // We already have a normalizedUrl in the request body for duplicate check, 
    // but we'll ensure it's fresh.
    const normalizedUrl = normalizeUrl(originalUrl);

    // ── 3. Determine Network & Platform ─────────────
    let platform = "admitad";
    let brandId = brand ? brand._id : null;
    let networkId = "admitad"; 

    if (brand) {
      networkId = brand.networkId;
      const network = await Network.findById(networkId).lean();
      if (network) {
        platform = network.key;
      }
    }

    // If no brand detected, use platform string to find default networkId
    if (!networkId) {
      const network = await Network.findOne({ key: platform }).lean();
      if (network) networkId = network._id;
    }

    // ── 4. Duplicate check ───────────────────────
    const existingLink = await AffiliateLink.findOne({ 
      creatorId,
      networkId,
      normalizedUrl
    }).lean();

    if (existingLink) {
      console.log(`Link deduplication: found existing code ${existingLink.shortCode} for ${normalizedUrl} on ${networkId}`);
      return res.status(200).json({
        message: "Existing link retrieved",
        shortCode: existingLink.shortCode,
        platform: existingLink.platform,
        productTitle: existingLink.productTitle,
        productImage: existingLink.productImage,
        oneInfoLink: existingLink.publicUrl,
        affiliateUrl: existingLink.affiliateUrl,
      });
    }

    // ── 5. BASE_URL guard ────────────────────────
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      console.error("BASE_URL is not set in .env");
      return res.status(500).json({ error: "Server misconfiguration: BASE_URL missing" });
    }

    // ── Unique shortCode generation (max 5 attempts) ──
    let link = null;
    let attempts = 0;
    let shortCode;

    while (!link && attempts < 5) {
      attempts++;
      shortCode = generateShortCode(6);

      // (Network and service logic already handled above)
      const service = getServiceByKey(platform);
      let finalAffiliateUrl;

      try {
        const base = service.generateBaseLink(originalUrl, shortCode, brand);
        finalAffiliateUrl = buildAffiliateUrl({
          platform,
          baseUrl: base,
          creatorId,
          shortCode,
        });
      } catch (err) {
        console.error(`${platform} link generation failed:`, err.message);
        return res.status(500).json({ error: `Failed to generate tracking link: ${err.message}` });
      }

      // Basic validation for tracking URLs
      if (platform === "cuelinks" && !finalAffiliateUrl.includes("linksredirect.com")) {
        console.error("Invalid Cuelinks affiliateUrl generated:", finalAffiliateUrl);
        return res.status(500).json({ error: "Cuelinks tracking URL validation failed" });
      } else if (platform === "admitad" && !finalAffiliateUrl.includes("tjzuh.com")) {
        console.error("Invalid Admitad affiliateUrl generated:", finalAffiliateUrl);
        return res.status(500).json({ error: "Admitad tracking URL validation failed" });
      }

      // ── Scrape product metadata (non-critical, never blocks link creation) ──
      let productTitle = "";
      let productImage = "";
      try {
        const ogData = await scrapeOG(originalUrl);
        productTitle = ogData.productTitle || "";
        productImage = ogData.productImage || "";
      } catch (scrapeErr) {
        console.warn("OG scraping failed (non-fatal):", scrapeErr.message);
      }

      // ── Build publicUrl ────────────────────────────────────────────
      const publicUrl = `${baseUrl}/share/${shortCode}`;

      // ── Save to DB ─────────────────────────────────────────────────
      try {
        link = await AffiliateLink.create({
          shortCode,
          originalUrl: normalizedUrl,   // Save normalized version to prevent future dupes
          normalizedUrl,                // ← REQUIRED: used by compound dedup index + query
          affiliateUrl: finalAffiliateUrl,
          publicUrl,
          creatorId,
          platform,
          brandId: brandId || undefined,
          networkId: networkId || undefined,
          productTitle,
          productImage,
          clickCount: 0,
          isActive: true,
          expiresAt: null,
        });
      } catch (err) {
        if (err.code === 11000) {
          // Determine WHICH unique key collided:
          // • shortCode collision  → retry with a new code
          // • dedup index collision (creatorId+networkId+normalizedUrl) → return existing
          const dupKey = err.keyPattern || {};
          if (dupKey.normalizedUrl || dupKey['normalizedUrl'] !== undefined ||
              (err.keyValue && err.keyValue.normalizedUrl !== undefined)) {
            // Same URL already exists for this creator+network — surface it
            const existingLink = await AffiliateLink.findOne({ creatorId, networkId, normalizedUrl }).lean();
            if (existingLink) {
              console.log(`Link dedup (index race): returning existing code ${existingLink.shortCode}`);
              return res.status(200).json({
                message: "Existing link retrieved",
                shortCode: existingLink.shortCode,
                platform: existingLink.platform,
                productTitle: existingLink.productTitle,
                productImage: existingLink.productImage,
                oneInfoLink: existingLink.publicUrl,
                affiliateUrl: existingLink.affiliateUrl,
              });
            }
          }
          // shortCode collision — retry with a new code
          link = null;
          continue;
        }
        throw err; // unexpected DB error — bubble up
      }
    }

    if (!link) {
      return res.status(500).json({
        error: "Could not generate a unique short code after 5 attempts. Please retry.",
      });
    }

    // ── Response ──────────────────────────────────────────────────────
    return res.status(201).json({
      message: "Link created successfully",
      shortCode: link.shortCode,
      platform: link.platform,
      productTitle: link.productTitle,
      productImage: link.productImage,
      oneInfoLink: link.publicUrl,   // e.g. http://localhost:4000/share/abc123
      affiliateUrl: link.affiliateUrl, // Admitad tracking URL (for debug only)
    });

  } catch (error) {
    console.error("Create link error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// POST /links/rescrape
// Re-fetches OG metadata for links that are missing images
// ─────────────────────────────────────────────
router.post("/rescrape", async (req, res) => {
  try {
    const creatorId = req.creatorId;
    if (!creatorId) return res.status(401).json({ error: "Unauthorized" });

    const links = await AffiliateLink.find({
      creatorId,
      $or: [
        { productImage: { $exists: false } },
        { productImage: "" },
        { productImage: null },
      ],
    }).lean();

    if (!links.length) {
      return res.json({ message: "All links already have images.", updated: 0 });
    }

    let updated = 0;
    const BATCH = 5;

    for (let i = 0; i < links.length; i += BATCH) {
      const batch = links.slice(i, i + BATCH);

      await Promise.all(
        batch.map(async (link) => {
          try {
            const ogData = await scrapeOG(link.originalUrl);
            if (ogData.productImage || ogData.productTitle) {
              await AffiliateLink.updateOne(
                { _id: link._id },
                {
                  $set: {
                    productImage: ogData.productImage || link.productImage || "",
                    productTitle: ogData.productTitle || link.productTitle || "",
                  },
                }
              );
              updated++;
            }
          } catch (e) {
            console.warn("Rescrape failed for", link.shortCode, e.message);
          }
        })
      );
    }

    return res.json({
      message: `Rescrape complete. Updated ${updated} of ${links.length} links.`,
      updated,
      total: links.length,
    });

  } catch (error) {
    console.error("Rescrape error:", error);
    return res.status(500).json({ error: "Server error during rescrape" });
  }
});



module.exports = router;