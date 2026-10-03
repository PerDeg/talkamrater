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
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const cleanText = (v, max) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export const EXPERT_KEYS = { plus: 'expert', minus: 'mexpert', dubbel: 'dexpert' };

export function emptyProgress() {
  return {
    best: {}, total: 0, rounds: 0, stickers: [], path: {}, records: {}, tricky: {},
    pet: { xp: 0, last: 0, born: 0, name: '' },
    daily: { day: 0, streak: 0, best: 0, count: 0 }
  };
}

export function sanitizeProgress(p) {
  const src = obj(p);
  const pet = obj(src.pet), daily = obj(src.daily);
  return {
    best: intMap(src.best, 3),
    total: int(src.total, 0, 1e7),
    rounds: int(src.rounds, 0, 1e7),
    stickers: Array.isArray(src.stickers)
      ? src.stickers.filter(s => typeof s === 'string' && s.length > 0 && s.length <= 16).slice(0, 5000)
      : [],
    path: intMap(src.path, 1000),
    records: intMap(src.records, 10000),
    // Kluriga kamrater: "8:3" (plus), "m8:3" (minus), "d6:6" (dubblor)
    tricky: intMap(src.tricky, 99, /^[md]?\d{1,2}:\d{1,2}$/),
    pet: { xp: int(pet.xp, 0, 1e6), last: int(pet.last, 0, 1e6), born: int(pet.born, 0, 1e6), name: cleanText(pet.name, 16) },
    daily: { day: int(daily.day, 0, 1e6), streak: int(daily.streak, 0, 1e5), best: int(daily.best, 0, 1e5), count: int(daily.count, 0, 1e6) }
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
  // Dagens utmaning: den senaste dagen vinner, längsta svit vid samma dag
  const newer = b.daily.day > a.daily.day || (b.daily.day === a.daily.day && b.daily.streak >= a.daily.streak) ? b.daily : a.daily;
  return {
    best: maxMap(a.best, b.best),
    total: Math.max(a.total, b.total),
    rounds: Math.max(a.rounds, b.rounds),
    stickers,
    path: maxMap(a.path, b.path),
    records: maxMap(a.records, b.records),
    // Kluriga kamrater ska kunna bli färre, så den senaste versionen vinner
    tricky: b.tricky,
    pet: {
      xp: Math.max(a.pet.xp, b.pet.xp),
      last: Math.max(a.pet.last, b.pet.last),
      born: Math.min(...[a.pet.born, b.pet.born].filter(Boolean), 1e6) % 1e6,
      name: b.pet.name || a.pet.name
    },
    daily: { ...newer, best: Math.max(a.daily.best, b.daily.best, newer.streak), count: Math.max(a.daily.count, b.daily.count) }
  };
}

export function summarize(p) {
  const s = sanitizeProgress(p);
  return {
    stars: s.total,
    stickers: new Set(s.stickers).size,
    pathDone: Object.values(s.path).filter(v => v > 0).length,
    medals: Object.entries(s.path).filter(([k, v]) => k.startsWith('t-') && v > 0).length,
    expert: (s.path.expert || 0) > 0,
    experts: Object.entries(EXPERT_KEYS).filter(([, k]) => (s.path[k] || 0) > 0).map(([w]) => w),
    petXp: s.pet.xp,
    dailyStreak: s.daily.streak
  };
}
