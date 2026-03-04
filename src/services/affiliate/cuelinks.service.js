const { URL } = require("url");
const _fetch = typeof fetch !== "undefined" ? fetch : require("node-fetch");
const Brand = require("../../brands/brand.model");

class CuelinksService {
  constructor() {}

  // Generate a Cuelinks tracking URL using brand campaign id
  generateBaseLink(originalUrl, shortCode, brand) {
    if (!brand || !brand.networkCampaignId) {
      throw new Error("Brand with networkCampaignId is required for Cuelinks link generation");
    }

    const cid = brand.networkCampaignId;

    const base = new URL("https://linksredirect.com/");
    base.searchParams.set("cid", cid.toString());
    base.searchParams.set("source", "linkkit");
    base.searchParams.set("url", originalUrl);
    
    return base.toString();
  }

  // Fetch transactions from Cuelinks API between dateStart and dateEnd (ISO strings)
  // Expects environment variables: CUELINKS_API_URL, CUELINKS_API_KEY
  async fetchActions(dateStart, dateEnd) {
    const apiUrl = process.env.CUELINKS_API_URL || "https://linksredirect.com/api/transactions";
    const apiKey = process.env.CUELINKS_API_KEY || process.env.CUELINKS_TOKEN;

    if (!apiKey) {
      console.warn("CUELINKS_API_KEY not configured; skipping fetchActions");
      return [];
    }

    try {
      const url = new URL(apiUrl);
      if (dateStart) url.searchParams.set("start_date", dateStart);
      if (dateEnd) url.searchParams.set("end_date", dateEnd);

      const res = await _fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Cuelinks API error", res.status, text);
        return [];
      }

      const data = await res.json();

      // Attempt to normalize a few common shapes. Return array of transaction objects with keys:
      // { order_id, status, payment, price, subid, transaction_id, cid }
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.transactions)) return data.transactions;
      if (data && data.results && Array.isArray(data.results)) return data.results;

      return [];
    } catch (err) {
      console.error("Cuelinks fetchActions error:", err.message);
      return [];
    }
  }
}

module.exports = new CuelinksService();
