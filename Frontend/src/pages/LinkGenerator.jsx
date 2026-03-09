
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../lib/axios';
import { Copy, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Route every brand logo through the backend image-proxy so CDN
 * hotlink-protection never blocks it (Lifestyle, Plum, future brands).
 */const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* ─────────────────────────────────────────────
   Clean image URLs — strip HTML entities and
   stray encoded quotes that break the URL
───────────────────────────────────────────── */
function cleanImageUrl(url) {
  if (!url) return '';
  return url
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '')
    .replace(/%26quot%3B/gi, '')
    .replace(/["']/g, '')
    .replace(/[,;\s]+$/g, '')
    .trim();
}

/**
 * BrandLogo – tries the proxied logo, falls back to coloured initials only
 * on genuine load failure. Isolated state per-card avoids React shared-state bugs.
 */
const BrandLogo = ({ brand, size = 'md' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClasses = size === 'lg'
    ? 'w-14 h-14 text-sm'
    : 'w-10 h-10 text-xs';

  const proxied = !imgFailed && brand.logoUrl ? cleanImageUrl(brand.logoUrl) : null;

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

            {/* ── Brand selector ────────────────────────────────────────── */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Detected Brand
              </label>

              {detectedBrand ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {brands.filter(b => b._id === detectedBrand).map((b) => (
                    <div
                      key={b._id}
                      className="p-3 rounded-xl border border-green-500 bg-green-50 text-green-800 shadow-sm flex items-center gap-4"
                    >
                      <BrandLogo brand={b} />
                      <div className="flex-1 min-w-0">
                         <span className="block truncate text-sm font-bold">{b.name}</span>
                         <span className="block text-xs text-green-600">✓ Auto-detected</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm flex items-center justify-center">
                  {originalUrl ? "No supported brand detected for this URL." : "Paste a link above to auto-detect the brand."}
                </div>
              )}
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
                    src={cleanImageUrl(shortLink.productImage)}
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
