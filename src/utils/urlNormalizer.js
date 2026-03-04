/**
 * Normalizes a URL for comparison and de-duplication.
 * @param {string} url - The URL to normalize.
 * @returns {string} - The normalized URL.
 */
function normalizeUrl(url) {
  if (!url) return "";

  try {
    const urlObj = new URL(url);

    // 1. Convert hostname to lowercase (standards compliant)
    urlObj.hostname = urlObj.hostname.toLowerCase();

    // 2. Remove common tracking query parameters
    const paramsToStrip = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "s",
      "fbclid",
      "gclid",
      "msclkid",
      "_ga",
      "_gl",
    ];

    paramsToStrip.forEach((p) => urlObj.searchParams.delete(p));

    // 3. Sort query parameters to ensure consistency (?a=1&b=2 vs ?b=2&a=1)
    urlObj.searchParams.sort();

    // 4. Remove trailing slash from the path
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    urlObj.pathname = pathname;

    // 5. Remove empty hash
    if (urlObj.hash === "#") {
      urlObj.hash = "";
    }

    return urlObj.toString();
  } catch (e) {
    // If URL is invalid, just return as is or trimmed
    return url.trim();
  }
}

module.exports = { normalizeUrl };
