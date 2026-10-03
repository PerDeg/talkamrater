import express from 'express';
import { insertId } from './db.js';
import { newToken, hashToken, validPin, hashPin, checkPin, safeEqual, newClassCode, normalizeCode, rateLimiter } from './auth.js';
import { emptyProgress, sanitizeProgress, mergeProgress, summarize } from './progress.js';
import { classMission, celebrateMission } from './mission.js';
import { petView, eventText, medalIcons } from './display.js';

// Händelser som kan visas i klassens flöde. Texten byggs i spelet utifrån typ + detalj.
// Bara större händelser, så att flödet inte svämmar över i en stor klass.
// 'mission' skapas av servern när klassen klarar veckans uppdrag.
const EVENT_TYPES = ['medal', 'expert', 'daily', 'book', 'pet'];
const EVENT_DETAIL = /^[\p{L}\p{N} :_-]{0,32}$/u;
const EVENTS_PER_DAY = 3;
const FEED_LENGTH = 12;

const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐵', '🐰', '🐶', '🐱', '🦄', '🐲'];
const MAX_PLAYERS_PER_CLASS = 60;
const LOCK_AFTER = 5;
const LOCK_MS = 5 * 60 * 1000;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const cleanName = n => String(n || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);

export function createApp({ db, t, client, adminKey, publicDir, trustProxy = 'loopback, linklocal, uniquelocal', allowedOrigins = [], publicUrl = '' }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);

  const origins = allowedOrigins.filter(Boolean);
  app.use((req, res, next) => {
    // Widgeten får bäddas in på de sajter som står i ALLOWED_ORIGINS
    const embeddable = req.path === '/widget.html';
    const ancestors = embeddable ? ["'self'", ...origins].join(' ') : "'self'";
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' blob: data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors ${ancestors}`
    });
    if (!embeddable) res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  const api = express.Router();
  api.use(express.json({ limit: '64kb' }));
  api.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  const lookupLimit = rateLimiter({ windowMs: 60_000, max: 30 });
  const loginLimit = rateLimiter({ windowMs: 60_000, max: 20 });

  /* ---------- Hjälpfunktioner ---------- */
  async function startSession(playerId) {
    const token = newToken();
    const now = Date.now();
    await db(t.sessions).insert({ token_hash: hashToken(token), player_id: playerId, created_at: now, last_seen: now });
    await db(t.players).where({ id: playerId }).update({ last_seen: now });
    return token;
  }
  async function loadProgress(playerId) {
    const row = await db(t.progress).where({ player_id: playerId }).first();
    if (!row) return { progress: emptyProgress(), version: 0 };
    let data = {};
    try { data = JSON.parse(row.data); } catch { /* trasig rad, börja om */ }
    return { progress: sanitizeProgress(data), version: Number(row.version) };
  }
  async function saveProgress(playerId, incoming) {
    return db.transaction(async trx => {
      let q = trx(t.progress).where({ player_id: playerId });
      if (client !== 'better-sqlite3') q = q.forUpdate(); // SQLite låser hela filen ändå
      const row = await q.first();
      let stored = emptyProgress();
      if (row) { try { stored = JSON.parse(row.data); } catch { /* ignoreras */ } }
      const merged = mergeProgress(stored, incoming);
      const now = Date.now();
      if (row) {
        await trx(t.progress).where({ player_id: playerId }).update({ data: JSON.stringify(merged), version: Number(row.version) + 1, updated_at: now });
      } else {
        await trx(t.progress).insert({ player_id: playerId, data: JSON.stringify(merged), version: 1, updated_at: now });
      }
      return merged;
    });
  }
  async function classByCode(code) {
    const c = await db(t.classes).where({ code: normalizeCode(code) }).first();
    if (!c) fail(404, 'Hittar ingen klass med den koden. Kolla med din lärare.');
    return c;
  }
  const publicPlayer = (p, c) => ({ id: Number(p.id), name: p.name, avatar: p.avatar, className: c?.name, classCode: c?.code });

  async function auth(req, res, next) {
    const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
    if (!m) return res.status(401).json({ error: 'Inte inloggad' });
    const s = await db(t.sessions).where({ token_hash: hashToken(m[1]) }).first();
    if (!s) return res.status(401).json({ error: 'Inloggningen har gått ut' });
    const player = await db(t.players).where({ id: s.player_id }).first();
    if (!player) return res.status(401).json({ error: 'Spelaren finns inte längre' });
    const now = Date.now();
    if (now - Number(s.last_seen) > 3_600_000) {
      await db(t.sessions).where({ token_hash: s.token_hash }).update({ last_seen: now });
      await db(t.players).where({ id: player.id }).update({ last_seen: now });
    }
    req.player = player;
    req.tokenHash = s.token_hash;
    next();
  }
  function admin(req, res, next) {
    if (!adminKey) return res.status(503).json({ error: 'Adminläget är avstängt. Sätt ADMIN_KEY på servern.' });
    if (!safeEqual(req.get('x-admin-key') || '', adminKey)) return res.status(401).json({ error: 'Fel adminnyckel' });
    next();
  }

  /* ---------- Öppna anrop ---------- */
  api.get('/health', async (req, res) => {
    await db.raw('select 1');
    res.json({ ok: true, app: 'talkamrater', version: 2 });
  });

  api.get('/classes/:code', lookupLimit, async (req, res) => {
    const c = await classByCode(req.params.code);
    const players = await db(t.players).where({ class_id: c.id }).orderBy('name');
    res.json({
      class: { name: c.name, code: c.code },
      players: players.map(p => ({ id: Number(p.id), name: p.name, avatar: p.avatar, needsPin: !p.pin_hash }))
    });
  });

  api.post('/classes/:code/players', loginLimit, async (req, res) => {
    const c = await classByCode(req.params.code);
    const name = cleanName(req.body?.name);
    const avatar = AVATARS.includes(req.body?.avatar) ? req.body.avatar : AVATARS[0];
    const pin = req.body?.pin;
    if (name.length < 2) fail(400, 'Skriv ditt namn (minst två bokstäver).');
    if (!validPin(pin)) fail(400, 'Välj tre bilder som din hemliga kod.');
    const count = await db(t.players).where({ class_id: c.id }).count({ n: '*' }).first();
    if (Number(count.n) >= MAX_PLAYERS_PER_CLASS) fail(409, 'Klassen är full.');
    const taken = await db(t.players).where({ class_id: c.id }).whereRaw('lower(name) = ?', [name.toLowerCase()]).first();
    if (taken) fail(409, `Det finns redan någon som heter ${taken.name} i klassen. Lägg till första bokstaven i efternamnet, t.ex. "${name} K".`);
    const id = await insertId(db, client, t.players, { class_id: c.id, name, avatar, pin_hash: hashPin(pin), created_at: Date.now() });
    const player = await db(t.players).where({ id }).first();
    const token = await startSession(id);
    res.status(201).json({ token, player: publicPlayer(player, c), ...(await loadProgress(id)) });
  });

  api.post('/login', loginLimit, async (req, res) => {
    const c = await classByCode(req.body?.code);
    const player = await db(t.players).where({ id: Number(req.body?.playerId) || 0, class_id: c.id }).first();
    if (!player) fail(404, 'Hittar inte spelaren.');
    const pin = req.body?.pin;
    if (!validPin(pin)) fail(400, 'Tryck på tre bilder.');
    const now = Date.now();
    if (player.locked_until && Number(player.locked_until) > now) {
      fail(423, 'För många fel. Vänta fem minuter, eller be din lärare om hjälp.');
    }
    if (!player.pin_hash) {
      // Läraren har nollställt koden – den här blir den nya
      await db(t.players).where({ id: player.id }).update({ pin_hash: hashPin(pin), failed: 0, locked_until: null });
    } else if (!checkPin(pin, player.pin_hash)) {
      const failed = Number(player.failed) + 1;
      await db(t.players).where({ id: player.id }).update({ failed: failed >= LOCK_AFTER ? 0 : failed, locked_until: failed >= LOCK_AFTER ? now + LOCK_MS : null });
      fail(401, failed >= LOCK_AFTER ? 'För många fel. Vänta fem minuter, eller be din lärare om hjälp.' : 'Det var inte rätt bilder. Försök igen!');
    } else if (Number(player.failed) > 0) {
      await db(t.players).where({ id: player.id }).update({ failed: 0, locked_until: null });
    }
    const token = await startSession(player.id);
    res.json({ token, player: publicPlayer(player, c), ...(await loadProgress(player.id)) });
  });

  /* ---------- Inloggad spelare ---------- */
  api.get('/me', auth, async (req, res) => {
    const c = await db(t.classes).where({ id: req.player.class_id }).first();
    res.json({ player: publicPlayer(req.player, c), ...(await loadProgress(req.player.id)) });
  });

  api.patch('/me', auth, async (req, res) => {
    const avatar = req.body?.avatar;
    if (!AVATARS.includes(avatar)) fail(400, 'Okänd avatar');
    await db(t.players).where({ id: req.player.id }).update({ avatar });
    res.json({ ok: true });
  });

  api.put('/me/progress', auth, async (req, res) => {
    const progress = await saveProgress(req.player.id, req.body?.progress);
    res.json({ progress });
  });

  api.post('/me/rounds', auth, async (req, res) => {
    const b = req.body || {};
    const n = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));
    await db(t.rounds).insert({
      player_id: req.player.id,
      level: String(b.level ?? '').slice(0, 16),
      mode: String(b.mode ?? '').slice(0, 16),
      stars: n(b.stars, 3), score: n(b.score, 1000), total: n(b.total, 1000), mistakes: n(b.mistakes, 1000),
      created_at: Date.now()
    });
    const count = await db(t.players).where({ class_id: req.player.class_id }).count({ n: '*' }).first();
    const mission = await classMission(db, t, req.player.class_id, Number(count.n), req.player.id);
    const completed = await celebrateMission(db, t, client, req.player.class_id, req.player.id, mission);
    res.json({ mission, completed });
  });

  api.get('/me/class', auth, async (req, res) => {
    const c = await db(t.classes).where({ id: req.player.class_id }).first();
    const rows = await db(t.players).leftJoin(t.progress, `${t.players}.id`, `${t.progress}.player_id`)
      .where(`${t.players}.class_id`, c.id).select(`${t.players}.id`, `${t.players}.name`, `${t.players}.avatar`, `${t.progress}.data`)
      .orderBy(`${t.players}.name`);
    const players = rows.map(r => {
      let data = {};
      try { data = r.data ? JSON.parse(r.data) : {}; } catch { /* ignoreras */ }
      return { id: Number(r.id), name: r.name, avatar: r.avatar, me: Number(r.id) === Number(req.player.id), ...summarize(data) };
    });
    const me = Number(req.player.id);
    const evRows = await db(t.events).join(t.players, `${t.events}.player_id`, `${t.players}.id`)
      .where(`${t.events}.class_id`, c.id)
      .select(`${t.events}.id`, `${t.events}.type`, `${t.events}.detail`, `${t.events}.created_at`, `${t.events}.player_id`, `${t.players}.name`, `${t.players}.avatar`)
      .orderBy(`${t.events}.created_at`, 'desc').limit(FEED_LENGTH);
    const ids = evRows.map(e => e.id);
    const cheerRows = ids.length ? await db(t.cheers).whereIn('event_id', ids).select('event_id', 'player_id') : [];
    const events = evRows.map(e => {
      const cs = cheerRows.filter(x => Number(x.event_id) === Number(e.id));
      return {
        id: Number(e.id), type: e.type, detail: e.detail, at: Number(e.created_at),
        name: e.name, avatar: e.avatar, mine: Number(e.player_id) === me,
        cheers: cs.length, cheered: cs.some(x => Number(x.player_id) === me)
      };
    });
    const myCheers = await db(t.cheers).join(t.events, `${t.cheers}.event_id`, `${t.events}.id`)
      .where(`${t.events}.player_id`, me).count({ n: '*' }).first();
    res.json({
      name: c.name, goal: Number(c.goal), total: players.reduce((s, p) => s + p.stars, 0), players,
      mission: await classMission(db, t, c.id, players.length, me),
      events, myCheers: Number(myCheers.n)
    });
  });

  api.post('/me/events', auth, async (req, res) => {
    const type = String(req.body?.type || '');
    const detail = String(req.body?.detail ?? '').trim().slice(0, 32);
    if (!EVENT_TYPES.includes(type) || !EVENT_DETAIL.test(detail)) fail(400, 'Okänd händelse');
    const dup = await db(t.events).where({ player_id: req.player.id, type, detail }).first();
    if (dup) return res.json({ id: Number(dup.id), duplicate: true });
    const today = await db(t.events).where({ player_id: req.player.id }).andWhere('created_at', '>', Date.now() - 86400000).count({ n: '*' }).first();
    if (Number(today.n) >= EVENTS_PER_DAY) return res.status(429).json({ error: 'För många händelser idag' });
    const id = await insertId(db, client, t.events, { class_id: req.player.class_id, player_id: req.player.id, type, detail, created_at: Date.now() });
    res.status(201).json({ id });
  });

  api.post('/events/:id/cheer', auth, async (req, res) => {
    const ev = await db(t.events).where({ id: Number(req.params.id) || 0 }).first();
    if (!ev || Number(ev.class_id) !== Number(req.player.class_id)) fail(404, 'Händelsen finns inte');
    if (Number(ev.player_id) === Number(req.player.id)) fail(400, 'Du kan inte heja på dig själv, men bra försök!');
    const had = await db(t.cheers).where({ event_id: ev.id, player_id: req.player.id }).first();
    if (!had) {
      try { await db(t.cheers).insert({ event_id: ev.id, player_id: req.player.id, created_at: Date.now() }); }
      catch { /* dubbelklick – raden finns redan */ }
    }
    const n = await db(t.cheers).where({ event_id: ev.id }).count({ n: '*' }).first();
    res.json({ cheers: Number(n.n) });
  });

  api.post('/logout', auth, async (req, res) => {
    await db(t.sessions).where({ token_hash: req.tokenHash }).del();
    res.status(204).end();
  });

  /* ---------- Publik klassstatus (widget på t.ex. klassens webbsida) ---------- */
  // Bara för klasser där läraren slagit på "Visa på klassens webbsida".
  const publicApi = express.Router();
  publicApi.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && origins.includes(origin)) { res.set('Access-Control-Allow-Origin', origin); res.set('Vary', 'Origin'); }
    next();
  });
  publicApi.get('/classes/:code', lookupLimit, async (req, res) => {
    const c = await db(t.classes).where({ code: normalizeCode(req.params.code) }).first();
    if (!c || !c.public) fail(404, 'Klassen finns inte eller visas inte publikt.');
    const rows = await db(t.players).leftJoin(t.progress, `${t.players}.id`, `${t.progress}.player_id`)
      .where(`${t.players}.class_id`, c.id).select(`${t.players}.id`, `${t.players}.name`, `${t.players}.avatar`, `${t.progress}.data`);
    const parse = d => { try { return d ? JSON.parse(d) : {}; } catch { return {}; } };
    const total = rows.reduce((s, r) => s + summarize(parse(r.data)).stars, 0);
    const wanted = String(req.query.name || '').trim().toLowerCase();
    const row = wanted ? rows.find(r => r.name.toLowerCase() === wanted) : null;
    const mission = await classMission(db, t, c.id, rows.length, row ? row.id : null);
    let me = null;
    if (row) {
      const p = sanitizeProgress(parse(row.data));
      const sum = summarize(p);
      me = {
        name: row.name, avatar: row.avatar,
        stars: sum.stars, stickers: sum.stickers, steps: sum.pathDone, medals: sum.medals, medalIcons: medalIcons(p.path),
        experts: sum.experts, dailyStreak: sum.dailyStreak, contribution: mission.mine,
        pet: petView(p.pet)
      };
    }
    const events = await db(t.events).join(t.players, `${t.events}.player_id`, `${t.players}.id`)
      .where(`${t.events}.class_id`, c.id)
      .select(`${t.events}.type`, `${t.events}.detail`, `${t.events}.created_at`, `${t.players}.name`, `${t.players}.avatar`)
      .orderBy(`${t.events}.created_at`, 'desc').limit(Math.min(10, Math.max(0, Number(req.query.events ?? 5) || 0)));
    const base = publicUrl || `${req.protocol}://${req.get('host')}/`;
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      class: { name: c.name, code: c.code, players: rows.length },
      mission: {
        title: mission.title, unit: mission.unit, goal: mission.goal, progress: mission.progress,
        percent: Math.min(100, Math.round(100 * mission.progress / mission.goal)),
        done: mission.progress >= mission.goal, endsAt: mission.endsAt
      },
      jar: { total, goal: Number(c.goal) },
      me,
      nameNotFound: !!wanted && !row,
      events: events.map(e => ({ type: e.type, at: Number(e.created_at), name: e.name, avatar: e.avatar, text: eventText(e) })),
      playUrl: `${base}?klass=${encodeURIComponent(c.code)}`
    });
  });
  api.use('/public', publicApi);

  /* ---------- Admin (förälder/lärare) ---------- */
  api.get('/admin/classes', admin, async (req, res) => {
    const classes = await db(t.classes).orderBy('name');
    const players = await db(t.players).leftJoin(t.progress, `${t.players}.id`, `${t.progress}.player_id`)
      .select(`${t.players}.*`, `${t.progress}.data`).orderBy(`${t.players}.name`);
    res.json(classes.map(c => ({
      id: Number(c.id), name: c.name, code: c.code, goal: Number(c.goal), public: !!c.public,
      players: players.filter(p => Number(p.class_id) === Number(c.id)).map(p => {
        let data = {};
        try { data = p.data ? JSON.parse(p.data) : {}; } catch { /* ignoreras */ }
        const tricky = Object.entries(sanitizeProgress(data).tricky).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([k]) => {
            const [, w, n, a] = /^([md]?)(\d+):(\d+)$/.exec(k).map((v, i) => (i > 1 ? Number(v) : v));
            return w === 'm' ? `${n}−${a}=${n - a}` : w === 'd' ? `${n}+${n}=${2 * n}` : `${a}+${n - a}=${n}`;
          });
        return { id: Number(p.id), name: p.name, avatar: p.avatar, hasPin: !!p.pin_hash, lastSeen: p.last_seen ? Number(p.last_seen) : null, tricky, ...summarize(data) };
      })
    })));
  });

  api.post('/admin/classes', admin, async (req, res) => {
    const name = cleanName(req.body?.name);
    if (name.length < 1) fail(400, 'Ge klassen ett namn.');
    const goal = Math.max(10, Math.min(100000, Math.floor(Number(req.body?.goal)) || 500));
    for (let i = 0; i < 10; i++) {
      const code = newClassCode();
      if (await db(t.classes).where({ code }).first()) continue;
      const id = await insertId(db, client, t.classes, { code, name, goal, created_at: Date.now() });
      return res.status(201).json({ id, name, code, goal });
    }
    fail(500, 'Kunde inte skapa en unik klasskod.');
  });

  api.patch('/admin/classes/:id', admin, async (req, res) => {
    const patch = {};
    if (req.body?.name != null) patch.name = cleanName(req.body.name);
    if (req.body?.goal != null) patch.goal = Math.max(10, Math.min(100000, Math.floor(Number(req.body.goal)) || 500));
    if (req.body?.public != null) patch.public = !!req.body.public;
    if (!Object.keys(patch).length) fail(400, 'Inget att ändra.');
    const n = await db(t.classes).where({ id: Number(req.params.id) }).update(patch);
    if (!n) fail(404, 'Klassen finns inte.');
    res.json({ ok: true });
  });

  api.delete('/admin/classes/:id', admin, async (req, res) => {
    await db(t.classes).where({ id: Number(req.params.id) }).del();
    res.status(204).end();
  });

  api.post('/admin/players/:id/reset-pin', admin, async (req, res) => {
    const id = Number(req.params.id);
    const n = await db(t.players).where({ id }).update({ pin_hash: null, failed: 0, locked_until: null });
    if (!n) fail(404, 'Spelaren finns inte.');
    await db(t.sessions).where({ player_id: id }).del();
    res.json({ ok: true });
  });

  api.delete('/admin/players/:id', admin, async (req, res) => {
    await db(t.players).where({ id: Number(req.params.id) }).del();
    res.status(204).end();
  });

  api.get('/admin/players/:id/rounds', admin, async (req, res) => {
    const rows = await db(t.rounds).where({ player_id: Number(req.params.id) }).orderBy('created_at', 'desc').limit(50);
    res.json(rows.map(r => ({ level: r.level, mode: r.mode, stars: r.stars, score: r.score, total: r.total, mistakes: r.mistakes, at: Number(r.created_at) })));
  });

  api.use((req, res) => res.status(404).json({ error: 'Okänt API-anrop' }));
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ error: 'Felaktig förfrågan' });
    console.error(err);
    res.status(500).json({ error: 'Något gick fel på servern' });
  });

  app.use('/api', api);
  if (publicDir) {
    app.use(express.static(publicDir, {
      setHeaders(res, file) {
        // HTML, service worker och manifest ska alltid hämtas färskt så att uppdateringar syns direkt
        if (/\.(html|webmanifest)$|sw\.js$/.test(file)) res.set('Cache-Control', 'no-cache');
      }
    }));
  }
  return app;
}
