// Framsteg sparas som ett JSON-dokument per spelare.
// Sammanslagningen är "ta det bästa från båda" så att det aldrig går att tappa
// stjärnor eller klistermärken när man spelar på flera enheter.

const KEY = /^[A-Za-z0-9:_-]{1,24}$/;
const int = (v, min, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const intMap = (obj, max, keyRe = KEY, maxKeys = 400) => {
  const out = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj).slice(0, maxKeys)) if (keyRe.test(k)) out[k] = int(v, 0, max);
  return out;
};

export function emptyProgress() {
  return { best: {}, total: 0, rounds: 0, stickers: [], path: {}, records: {}, tricky: {} };
}

export function sanitizeProgress(p) {
  const src = p && typeof p === 'object' ? p : {};
  return {
    best: intMap(src.best, 3),
    total: int(src.total, 0, 1e7),
    rounds: int(src.rounds, 0, 1e7),
    stickers: Array.isArray(src.stickers)
      ? src.stickers.filter(s => typeof s === 'string' && s.length > 0 && s.length <= 16).slice(0, 5000)
      : [],
    path: intMap(src.path, 1000),
    records: intMap(src.records, 10000),
    tricky: intMap(src.tricky, 99, /^\d{1,2}:\d{1,2}$/)
  };
}

const maxMap = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] || 0, v);
  return out;
};
const countStickers = list => list.reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {});

export function mergeProgress(stored, incoming) {
  const a = sanitizeProgress(stored), b = sanitizeProgress(incoming);
  const ca = countStickers(a.stickers), cb = countStickers(b.stickers);
  const stickers = [];
  for (const s of new Set([...a.stickers, ...b.stickers])) {
    for (let i = 0; i < Math.max(ca[s] || 0, cb[s] || 0); i++) stickers.push(s);
  }
  return {
    best: maxMap(a.best, b.best),
    total: Math.max(a.total, b.total),
    rounds: Math.max(a.rounds, b.rounds),
    stickers,
    path: maxMap(a.path, b.path),
    records: maxMap(a.records, b.records),
    // Kluriga kamrater ska kunna bli färre, så den senaste versionen vinner
    tricky: b.tricky
  };
}

export function summarize(p) {
  const s = sanitizeProgress(p);
  return {
    stars: s.total,
    stickers: new Set(s.stickers).size,
    pathDone: Object.values(s.path).filter(v => v > 0).length,
    medals: ['t-z1', 't-z2', 't-z3', 't-z4'].filter(k => s.path[k] > 0).length,
    expert: (s.path.expert || 0) > 0
  };
}
