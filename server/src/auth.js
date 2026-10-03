import crypto from 'node:crypto';

export const newToken = () => crypto.randomBytes(32).toString('base64url');
export const hashToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');

// Bildkoden är tre bilder av tolv, t.ex. [3, 7, 1].
export const PIN_LENGTH = 3;
export const PIN_SYMBOLS = 12;
export function validPin(pin) {
  return Array.isArray(pin) && pin.length === PIN_LENGTH && pin.every(n => Number.isInteger(n) && n >= 0 && n < PIN_SYMBOLS);
}
export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin.join('-'), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
export function checkPin(pin, stored) {
  if (!stored || !validPin(pin)) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pin.join('-'), salt, 32);
  const want = Buffer.from(hash, 'hex');
  return want.length === test.length && crypto.timingSafeEqual(want, test);
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const WORDS = ['SOL', 'HAV', 'SKOG', 'BERG', 'MOLN', 'REGN', 'VIND', 'RAKET', 'PIRAT', 'DRAKE', 'TIGER', 'PANDA', 'UGGLA', 'KOMET', 'PLANET', 'BUBBLA'];
export function newClassCode() {
  return `${WORDS[crypto.randomInt(WORDS.length)]}-${crypto.randomInt(1000, 10000)}`;
}
export const normalizeCode = code => String(code || '').trim().toUpperCase().replace(/\s+/g, '').replace(/^([A-Z]+)(\d+)$/, '$1-$2');

// Enkel minnesbaserad begränsning av antal anrop per IP.
export function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const key = req.ip || 'okänd';
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) { h = { count: 0, reset: now + windowMs }; hits.set(key, h); }
    h.count++;
    if (h.count > max) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ error: 'För många försök. Vänta en liten stund och prova igen.' });
    }
    next();
  };
}
