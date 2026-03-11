const admitadService = require("./admitad.service");
const cuelinksService = require("./cuelinks.service");

function getServiceByKey(key) {
  if (!key) return cuelinksService;

  const k = key.toLowerCase();
  if (k === "cuelinks") return cuelinksService;
  if (k === "admitad") return admitadService;
  
  return cuelinksService; // fallback
}

module.exports = { getServiceByKey };
