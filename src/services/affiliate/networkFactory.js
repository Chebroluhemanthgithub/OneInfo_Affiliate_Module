const admitadService = require("./admitad.service");
const cuelinksService = require("./cuelinks.service");

function getServiceByKey(key) {
  if (!key) return admitadService;

  const k = key.toLowerCase();
  if (k === "admitad") return admitadService;
  if (k === "cuelinks") return cuelinksService;
  return admitadService; // fallback
}

module.exports = { getServiceByKey };
