
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../lib/axios';
import { Copy, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Route every brand logo through the backend image-proxy so CDN
 * hotlink-protection never blocks it (Lifestyle, Plum, future brands).
 */
const proxyLogo = (url) =>
  url ? `http://localhost:4000/image-proxy?url=${encodeURIComponent(url)}` : null;

/**
 * BrandLogo – tries the proxied logo, falls back to coloured initials only
 * on genuine load failure. Isolated state per-card avoids React shared-state bugs.
 */
const BrandLogo = ({ brand, size = 'md' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClasses = size === 'lg'
    ? 'w-14 h-14 text-sm'
    : 'w-10 h-10 text-xs';

  const proxied = !imgFailed && proxyLogo(brand.logoUrl);

  // Generate a stable pastel colour from the brand name (deterministic)
  const pastelBg = () => {
    let hash = 0;
    for (let i = 0; i < brand.name.length; i++) {
      hash = brand.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 88%)`;
  };

  return (
    <div
      className={`${sizeClasses} rounded-lg overflow-hidden flex items-center justify-center border border-slate-100 shadow-inner bg-white`}
    >
      {proxied ? (
        <img
          key={brand.logoUrl}              // reset if logoUrl ever changes
          src={proxied}
          alt={brand.name}
          className="w-full h-full object-contain p-1.5"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold uppercase"
          style={{ background: pastelBg(), color: `hsl(${Math.abs(brand.name.charCodeAt(0) + ((0 << 5) - 0)) % 360}, 45%, 35%)` }}
        >
          {brand.name.substring(0, 2)}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const LinkGenerator = () => {
  const [originalUrl, setOriginalUrl] = useState('');
  const [brands, setBrands]           = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [detectedBrand, setDetectedBrand] = useState(null);
  const [shortLink, setShortLink]     = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [copied, setCopied]           = useState(false);

  // ── Fetch brands on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    api.get('/brands')
      .then((res) => { if (mounted) setBrands(res.data || []); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // ── Auto-detect brand from pasted URL ─────────────────────────────────────
  useEffect(() => {
    if (!originalUrl) {
      setDetectedBrand(null);
      return;
    }
    try {
      const { hostname } = new URL(originalUrl);
      const match = brands.find(b => b.domain && hostname.includes(b.domain));
      if (match) {
        setDetectedBrand(match._id);
        setSelectedBrand(match._id);   // auto-select too
      } else {
        setDetectedBrand(null);
      }
    } catch {
      setDetectedBrand(null);
    }
  }, [originalUrl, brands]);

  // ── Generate / fetch existing link ────────────────────────────────────────
  const generateLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShortLink(null);
    try {
      const body = { originalUrl };
      if (selectedBrand) body.brandId = selectedBrand;
      const res = await api.post('/links/create', body);
      setShortLink(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  // ── Copy link to clipboard ─────────────────────────────────────────────────
  const copyToClipboard = () => {
    if (!shortLink) return;
    navigator.clipboard.writeText(shortLink.oneInfoLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <div className="ml-64 p-8 w-full">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">Link Generator</h1>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-2xl">
          <form onSubmit={generateLink} className="space-y-6">

            {/* ── Brand selector ────────────────────────────────────────── */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Select Brand
                <span className="ml-1 text-slate-400 font-normal">(auto-detected from URL)</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Auto-detect option */}
                <button
                  type="button"
                  onClick={() => { setSelectedBrand(''); setDetectedBrand(null); }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                    !selectedBrand
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-xs font-semibold">Auto</span>
                  </div>
                  <span className="text-xs">Auto-detect</span>
                </button>

                {/* Brand cards — logo always goes through image proxy */}
                {brands.map((b) => {
                  const isSelected = selectedBrand === b._id;
                  const isDetected = detectedBrand === b._id;

                  return (
                    <button
                      key={b._id}
                      type="button"
                      onClick={() => setSelectedBrand(b._id)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md ring-1 ring-blue-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {/* Auto-detected badge */}
                      {isDetected && (
                        <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm z-10">
                          {isSelected ? 'Matched ✓' : 'Detected'}
                        </span>
                      )}

                      {/* Logo (via proxy) or coloured initials */}
                      <BrandLogo brand={b} />

                      <span className="truncate w-full text-center text-xs font-semibold">
                        {b.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── URL input ─────────────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Product URL</label>
              <input
                type="url"
                value={originalUrl}
                onChange={(e) => setOriginalUrl(e.target.value)}
                placeholder="Paste a product link — brand is auto-detected…"
                className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow placeholder:text-slate-400"
                required
              />
            </div>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white px-6 py-4 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:scale-100 font-semibold shadow-lg shadow-slate-200"
            >
              <span>{loading ? 'Generating…' : 'Generate Magic Link'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {error && (
            <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* ── Result card ───────────────────────────────────────────────── */}
          {shortLink && (
            <div className="mt-8 p-5 bg-green-50 border border-green-200 rounded-xl">

              {/* Product image + title */}
              {shortLink.productImage && (
                <div className="flex items-start gap-4 mb-4 pb-4 border-b border-green-200">
                  <img
                    src={`http://localhost:4000/image-proxy?url=${encodeURIComponent(
                      shortLink.productImage
                        .replace(/&quot;/g, '')
                        .replace(/%26quot%3B/gi, '')
                        .replace(/["']/g, '')
                        .trim()
                    )}`}
                    alt={shortLink.productTitle || 'Product'}
                    className="w-20 h-20 object-cover rounded-lg border border-green-200 bg-white"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/80x80?text=Product';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                      {shortLink.productTitle || 'Product Link'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <ExternalLink size={12} />
                      {shortLink.platform}
                      {shortLink.message === 'Existing link retrieved' && (
                        <span className="ml-2 text-green-600 font-medium">· existing link reused</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Short link row */}
              <p className="text-sm text-green-800 font-medium mb-2">Your Short Link:</p>
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200 mb-4">
                <input
                  readOnly
                  value={shortLink.oneInfoLink || ''}
                  className="w-full bg-transparent outline-none text-blue-600 font-mono text-sm font-bold"
                />
                <button
                  onClick={copyToClipboard}
                  className={`p-1.5 rounded transition-colors ${
                    copied ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                </button>
              </div>

              {/* Meta row */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Platform: <span className="font-bold text-slate-700 uppercase">{shortLink.platform}</span>
                </span>
                <span>
                  Code: <span className="font-mono font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded">{shortLink.shortCode}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkGenerator;
