// Quick test for the validateProductUrl function
// Run with: node scripts/test_url_validation.js

const BRAND_RULES = [
  {
    domain: "lifestylestores.com",
    isProduct(url) {
      try {
        const { pathname } = new URL(url);
        return pathname.includes("/SHOP-") && pathname.includes("/p/");
      } catch { return false; }
    },
    hint: "Please paste a specific Lifestyle product link.",
  },
  {
    domain: "plumgoodness.com",
    isProduct(url) {
      try {
        const { pathname } = new URL(url);
        return pathname.startsWith("/products/") && pathname.length > "/products/".length;
      } catch { return false; }
    },
    hint: "Please paste a specific Plum product link.",
  },
];

function validateProductUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch {
    return "Invalid URL. Please paste a full product link.";
  }
  if (parsed.protocol !== "https:") {
    return "Only HTTPS links are supported.";
  }
  const rule = BRAND_RULES.find((r) => parsed.hostname.includes(r.domain));
  if (!rule) {
    if (url.includes("myntra.com")) return "Myntra is not listed in our affiliation program.";
    const allowed = BRAND_RULES.map((r) => r.domain).join(", ");
    return `Unsupported brand. Currently supported brands: ${allowed}.`;
  }
  if (!rule.isProduct(url)) return rule.hint;
  return null;
}

const tests = [
  // ✅ SHOULD PASS (return null)
  { url: "https://www.lifestylestores.com/in/en/SHOP-Giggles-Brown-Giggles-Textured-Shirt-and-Shorts-Set-For-Boys/p/1100004715-Toffee-Brown", expect: null, label: "Lifestyle valid product" },
  { url: "https://plumgoodness.com/products/green-tea-pore-cleansing-face-wash", expect: null, label: "Plum valid product" },

  // ❌ SHOULD FAIL (return an error string)
  { url: "https://www.lifestylestores.com/in", expect: "error", label: "Lifestyle homepage" },
  { url: "https://www.lifestylestores.com/in/en/", expect: "error", label: "Lifestyle category page" },
  { url: "https://www.lifestylestores.com/in/en/men-clothes", expect: "error", label: "Lifestyle category (no /SHOP- or /p/)" },
  { url: "https://plumgoodness.com/", expect: "error", label: "Plum homepage" },
  { url: "https://plumgoodness.com/collections/face-care", expect: "error", label: "Plum collection page" },
  { url: "https://www.myntra.com/products/shirt", expect: "error", label: "Myntra (unsupported)" },
  { url: "https://amazon.in/product/123", expect: "error", label: "Amazon (unsupported)" },
  { url: "not-a-url", expect: "error", label: "Completely invalid URL" },
  { url: "http://www.lifestylestores.com/in/en/SHOP-Test/p/123", expect: "error", label: "HTTP (not HTTPS)" },
];

let passed = 0;
let failed = 0;
tests.forEach(({ url, expect, label }) => {
  const result = validateProductUrl(url);
  const ok = expect === null ? result === null : result !== null;
  if (ok) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${label}`);
    console.log(`   URL: ${url}`);
    console.log(`   Expected: ${expect === null ? "null (success)" : "an error"}`);
    console.log(`   Got: ${result}`);
    failed++;
  }
});

console.log(`\n─── Results: ${passed} passed, ${failed} failed ───`);
if (failed > 0) process.exit(1);
