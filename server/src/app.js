import express from 'express';
import { insertId } from './db.js';
import { newToken, hashToken, validPin, hashPin, checkPin, safeEqual, newClassCode, normalizeCode, rateLimiter } from './auth.js';
import { emptyProgress, sanitizeProgress, mergeProgress, summarize } from './progress.js';
import { classMission, celebrateMission, classPulse, celebrateAllIn } from './mission.js';
import { petView, eventText, medalIcons, nudge, validFocus, focusLabel, classPetView, TREATS } from './display.js';
import { weekStart, missionFor } from './mission.js';
import { METRICS, validMetric, contestView, contestForClass, celebrateContest, contestCheer } from './contest.js';

// Händelser som kan visas i klassens flöde. Texten byggs i spelet utifrån typ + detalj.
// Bara större händelser, så att flödet inte svämmar över i en stor klass.
// 'mission' skapas av servern när klassen klarar veckans uppdrag.
const EVENT_TYPES = ['medal', 'expert', 'daily', 'book', 'pet'];
const EVENT_DETAIL = /^[\p{L}\p{N} :_-]{0,32}$/u;
const EVENTS_PER_DAY = 3;
const FEED_LENGTH = 12;
// Hemliga presenter: en per elev och dag, till en slumpad klasskompis
const GIFTS_SHOWN = 10;
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
// Kunskapsväggen: hur många i klassen som kan ett tal (utan namn)
const KNOWS = 7;
function knowledgeWall(progressList) {
  const wall = {};
  for (const p of progressList) {
    for (const [k, v] of Object.entries(p.skill)) if (k !== 'g' && v >= KNOWS) wall[k] = (wall[k] || 0) + 1;
  }
  return wall;
}

const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐵', '🐰', '🐶', '🐱', '🦄', '🐲'];
const MAX_PLAYERS_PER_CLASS = 60;
const LOCK_AFTER = 5;
const LOCK_MS = 5 * 60 * 1000;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const cleanName = n => String(n || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);

export function createApp({ db, t, client, adminKey, publicDir, trustProxy = 'loopback, linklocal, uniquelocal', allowedOrigins = [], publicUrl = '', tts = null, loginPerMinute = 20 }) {
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
  const loginLimit = rateLimiter({ windowMs: 60_000, max: loginPerMinute });

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
  const publicPlayer = (p, c) => ({ id: Number(p.id), name: p.name, avatar: p.avatar, className: c?.solo ? null : c?.name, classCode: c?.code, solo: !!c?.solo, focus: p.focus || c?.focus || null });
  async function newCode() {
    for (let i = 0; i < 10; i++) {
      const code = newClassCode();
      if (!(await db(t.classes).where({ code }).first())) return code;
    }
    fail(500, 'Kunde inte skapa en unik kod.');
  }

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
  // Två sorters nycklar till lärarsidan:
  //  - ADMIN_KEY (huvudadmin) ser allt och skapar skolor
  //  - en skolas lärarnyckel ser bara den skolans klasser och klasskamper
  const adminLimit = rateLimiter({ windowMs: 60_000, max: 60 });
  async function admin(req, res, next) {
    const key = req.get('x-admin-key') || '';
    if (adminKey && safeEqual(key, adminKey)) { req.scope = { super: true }; return next(); }
    if (key.length >= 16) {
      const school = await db(t.schools).where({ key_hash: hashToken(key) }).first();
      if (school) { req.scope = { super: false, schoolId: Number(school.id), schoolName: school.name }; return next(); }
    }
    if (!adminKey && !(await db(t.schools).whereNotNull('key_hash').first())) {
      return res.status(503).json({ error: 'Adminläget är avstängt. Sätt ADMIN_KEY på servern.' });
    }
    return adminLimit(req, res, () => res.status(401).json({ error: 'Fel nyckel' }));
  }
  const superOnly = (req, res, next) => (req.scope.super ? next() : res.status(403).json({ error: 'Bara huvudadmin kan göra det här.' }));
  // Klassen/eleven måste höra till lärarens skola
  async function ownClass(req, id) {
    const c = await db(t.classes).where({ id: Number(id) || 0 }).first();
    if (!c || (!req.scope.super && Number(c.school_id) !== req.scope.schoolId)) fail(404, 'Klassen finns inte.');
    return c;
  }
  async function ownPlayer(req, id) {
    const p = await db(t.players).where({ id: Number(id) || 0 }).first();
    if (!p) fail(404, 'Spelaren finns inte.');
    await ownClass(req, p.class_id);
    return p;
  }

  /* ---------- Öppna anrop ---------- */
  api.get('/health', async (req, res) => {
    await db.raw('select 1');
    res.json({ ok: true, app: 'talkamrater', version: 2, tts: !!tts });
  });

  // Talsyntes: GET /api/tts?t=Hurra! ger en WAV-fil. Samma text ger alltid samma
  // ljud, så webbläsaren får spara det länge.
  const ttsLimit = rateLimiter({ windowMs: 60_000, max: 120 });
  api.get('/tts', ttsLimit, async (req, res) => {
    if (!tts) fail(404, 'Talsyntesen är inte installerad på servern.');
    let file;
    try { file = await tts.synth(String(req.query.t || '')); }
    catch (e) { fail(503, 'Talsyntesen svarar inte just nu.'); }
    res.set({ 'Content-Type': 'audio/wav', 'Cache-Control': 'public, max-age=2592000, immutable' });
    res.sendFile(file);
  });

  api.get('/classes/:code', lookupLimit, async (req, res) => {
    const c = await classByCode(req.params.code);
    const players = await db(t.players).where({ class_id: c.id }).orderBy('name');
    res.json({
      class: { name: c.name, code: c.code, solo: !!c.solo },
      players: players.map(p => ({ id: Number(p.id), name: p.name, avatar: p.avatar, needsPin: !p.pin_hash }))
    });
  });

  // Eget konto utan klass. Eleven får en egen kod (som en klasskod) och väljer en bildkod.
  const accountLimit = rateLimiter({ windowMs: 3_600_000, max: 10 });
  api.post('/accounts', accountLimit, async (req, res) => {
    const name = cleanName(req.body?.name);
    const avatar = AVATARS.includes(req.body?.avatar) ? req.body.avatar : AVATARS[0];
    const pin = req.body?.pin;
    if (name.length < 2) fail(400, 'Skriv ditt namn (minst två bokstäver).');
    if (!validPin(pin)) fail(400, 'Välj tre bilder som din hemliga kod.');
    const code = await newCode();
    const now = Date.now();
    const classId = await insertId(db, client, t.classes, { code, name, goal: 500, solo: true, created_at: now });
    const id = await insertId(db, client, t.players, { class_id: classId, name, avatar, pin_hash: hashPin(pin), created_at: now });
    const c = await db(t.classes).where({ id: classId }).first();
    const player = await db(t.players).where({ id }).first();
    const token = await startSession(id);
    res.status(201).json({ token, code, player: publicPlayer(player, c), ...(await loadProgress(id)) });
  });

  api.post('/classes/:code/players', loginLimit, async (req, res) => {
    const c = await classByCode(req.params.code);
    if (c.solo) fail(400, 'Det där är någons egen kod, inte en klasskod.');
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

  // Ett eget konto går med i en klass: stjärnor och allt annat följer med
  api.post('/me/join', auth, loginLimit, async (req, res) => {
    const from = await db(t.classes).where({ id: req.player.class_id }).first();
    if (!from || !from.solo) fail(400, 'Du är redan med i en klass.');
    const c = await classByCode(req.body?.code);
    if (c.solo) fail(400, 'Det där är någons egen kod, inte en klasskod.');
    const count = await db(t.players).where({ class_id: c.id }).count({ n: '*' }).first();
    if (Number(count.n) >= MAX_PLAYERS_PER_CLASS) fail(409, 'Klassen är full.');
    const name = req.body?.name != null ? cleanName(req.body.name) : req.player.name;
    if (name.length < 2) fail(400, 'Skriv ditt namn (minst två bokstäver).');
    const taken = await db(t.players).where({ class_id: c.id }).whereRaw('lower(name) = ?', [name.toLowerCase()]).first();
    if (taken) fail(409, `Det finns redan någon som heter ${taken.name} i klassen. Lägg till första bokstaven i efternamnet, t.ex. "${name} K".`);
    await db(t.players).where({ id: req.player.id }).update({ class_id: c.id, name });
    await db(t.classes).where({ id: from.id }).del(); // det egna kontots tomma "klass"
    const player = await db(t.players).where({ id: req.player.id }).first();
    res.json({ player: publicPlayer(player, c) });
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
    const pulse = await classPulse(db, t, req.player.class_id, Number(count.n));
    const allIn = await celebrateAllIn(db, t, client, req.player.class_id, req.player.id, pulse.everyone, mission.start);
    // Klasskamp: delmål för klassens berg (25/50/75/100 %)
    let contest = null;
    const cRow = await contestForClass(db, t, req.player.class_id);
    if (cRow) {
      const view = await contestView(db, t, cRow, req.player.class_id);
      const reached = await celebrateContest(db, t, client, cRow, view, req.player.class_id, req.player.id);
      const mine = view.classes.find(c => c.mine);
      contest = { title: view.title, unit: view.unit, mountain: view.mountain, progress: mine.progress, goal: mine.goal, percent: mine.percent, reached };
    }
    res.json({ mission: { ...mission, everyone: pulse.everyone }, completed, allIn, contest });
  });

  api.get('/me/class', auth, async (req, res) => {
    const c = await db(t.classes).where({ id: req.player.class_id }).first();
    const rows = await db(t.players).leftJoin(t.progress, `${t.players}.id`, `${t.progress}.player_id`)
      .where(`${t.players}.class_id`, c.id).select(`${t.players}.id`, `${t.players}.name`, `${t.players}.avatar`, `${t.progress}.data`)
      .orderBy(`${t.players}.name`);
    const progressList = [];
    const players = rows.map(r => {
      let data = {};
      try { data = r.data ? JSON.parse(r.data) : {}; } catch { /* ignoreras */ }
      progressList.push(sanitizeProgress(data));
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
    const pulse = await classPulse(db, t, c.id, players.length);
    const gifts = await db(t.gifts).where({ to_id: me, seen: false }).orderBy('created_at').limit(GIFTS_SHOWN);
    res.json({
      name: c.name, goal: Number(c.goal), total: players.reduce((s, p) => s + p.stars, 0), players,
      mission: { ...(await classMission(db, t, c.id, players.length, me)), everyone: pulse.everyone },
      pet: classPetView({ rounds: pulse.rounds, players: players.length, recent: pulse.recent }),
      wall: knowledgeWall(progressList),
      gifts: gifts.map(g => ({ id: Number(g.id), treat: g.treat, at: Number(g.created_at) })),
      contest: await (async () => { const r = await contestForClass(db, t, c.id); return r ? contestView(db, t, r, c.id) : null; })(),
      events, myCheers: Number(myCheers.n)
    });
  });

  // Hemlig present till en klasskompis husdjur. Den som får presenten får aldrig
  // veta vem den kom från, och den som ger får inte veta vem den gick till.
  api.post('/me/gift', auth, async (req, res) => {
    const treat = String(req.body?.treat || '');
    if (!TREATS[treat]) fail(400, 'Okänd godsak');
    const me = Number(req.player.id), classId = req.player.class_id, dayStart = startOfDay();
    const given = await db(t.gifts).where({ from_id: me }).andWhere('created_at', '>=', dayStart).first();
    if (given) return res.json({ sent: false, reason: 'today' });
    const mates = (await db(t.players).where({ class_id: classId }).whereNot({ id: me }).select('id', 'last_seen'))
      .sort((a, b) => (Number(a.last_seen) || 0) - (Number(b.last_seen) || 0));
    if (!mates.length) return res.json({ sent: false, reason: 'alone' });
    // Helst någon som inte fått en present idag, och gärna någon som inte spelat på ett tag
    const gotToday = new Set((await db(t.gifts).where({ class_id: classId }).andWhere('created_at', '>=', dayStart).select('to_id')).map(g => Number(g.to_id)));
    const fresh = mates.filter(m => !gotToday.has(Number(m.id)));
    const pool = (fresh.length ? fresh : mates).slice(0, Math.max(1, Math.ceil((fresh.length || mates.length) / 2)));
    const to = pool[Math.floor(Math.random() * pool.length)];
    await insertId(db, client, t.gifts, { class_id: classId, from_id: me, to_id: to.id, treat, seen: false, created_at: Date.now() });
    res.status(201).json({ sent: true });
  });

  api.post('/me/gifts/seen', auth, async (req, res) => {
    const n = await db(t.gifts).where({ to_id: req.player.id, seen: false }).update({ seen: true });
    res.json({ seen: Number(n) || 0 });
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
    if (!c || !c.public || c.solo) fail(404, 'Klassen finns inte eller visas inte publikt.');
    const rows = await db(t.players).leftJoin(t.progress, `${t.players}.id`, `${t.progress}.player_id`)
      .where(`${t.players}.class_id`, c.id).select(`${t.players}.id`, `${t.players}.name`, `${t.players}.avatar`, `${t.players}.focus`, `${t.progress}.data`);
    const parse = d => { try { return d ? JSON.parse(d) : {}; } catch { return {}; } };
    const total = rows.reduce((s, r) => s + summarize(parse(r.data)).stars, 0);
    const wanted = String(req.query.name || '').trim().toLowerCase();
    const row = wanted ? rows.find(r => r.name.toLowerCase() === wanted) : null;
    const mission = await classMission(db, t, c.id, rows.length, row ? row.id : null);
    const pulse = await classPulse(db, t, c.id, rows.length);
    const cRow = await contestForClass(db, t, c.id);
    const contest = cRow ? await contestView(db, t, cRow, c.id) : null;
    let me = null;
    if (row) {
      const p = sanitizeProgress(parse(row.data));
      const sum = summarize(p);
      me = {
        name: row.name, avatar: row.avatar,
        stars: sum.stars, stickers: sum.stickers, steps: sum.pathDone, medals: sum.medals, medalIcons: medalIcons(p.path),
        experts: sum.experts, dailyStreak: sum.dailyStreak, contribution: mission.mine,
        pet: petView(p.pet),
        nudge: nudge({
          pet: p.pet, daily: p.daily, mission, focus: row.focus || c.focus, tricky: p.tricky, everyone: pulse.everyone, contest: contestCheer(contest),
          gift: (await db(t.gifts).where({ to_id: row.id, seen: false }).orderBy('created_at').first())?.treat || null
        })
      };
    }
    const events = await db(t.events).join(t.players, `${t.events}.player_id`, `${t.players}.id`)
      .where(`${t.events}.class_id`, c.id)
      .select(`${t.events}.type`, `${t.events}.detail`, `${t.events}.created_at`, `${t.players}.name`, `${t.players}.avatar`)
      .orderBy(`${t.events}.created_at`, 'desc').limit(Math.min(10, Math.max(0, Number(req.query.events ?? 5) || 0)));
    const base = publicUrl || `${req.protocol}://${req.get('host')}/`;
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      class: { name: c.name, code: c.code, players: rows.length, pet: classPetView({ rounds: pulse.rounds, players: rows.length, recent: pulse.recent }) },
      mission: {
        title: mission.title, unit: mission.unit, goal: mission.goal, progress: mission.progress,
        percent: Math.min(100, Math.round(100 * mission.progress / mission.goal)),
        done: mission.progress >= mission.goal, endsAt: mission.endsAt, everyone: pulse.everyone
      },
      contest: contest && {
        title: contest.title, unit: contest.unit, mountain: contest.mountain, ended: contest.ended, endsAt: contest.endsAt, total: contest.total,
        classes: contest.classes.map(k => ({ name: k.name, progress: k.progress, goal: k.goal, percent: k.percent, mine: k.mine })),
        text: contestCheer(contest)
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
  // Lärarsidan: per elev vad den kan, vad den behöver träna, hur mycket den tränat och bidragit
  const WORLD_NAME = { p: 'Plus', m: 'Minus', d: 'Dubblor' };
  const pairText = k => {
    const [, w, n, a] = /^([md]?)(\d+):(\d+)$/.exec(k).map((v, i) => (i > 1 ? Number(v) : v));
    return w === 'm' ? `${n}−${a}=${n - a}` : w === 'd' ? `${n}+${n}=${2 * n}` : `${a}+${n - a}=${n}`;
  };
  const groupLevels = keys => {
    const by = {};
    for (const k of keys) (by[k[0]] = by[k[0]] || []).push(Number(k.slice(1)));
    return Object.entries(by).map(([w, ns]) => `${WORLD_NAME[w]}: ${ns.sort((a, b) => a - b).join(', ')}`);
  };
  api.get('/admin/me', admin, async (req, res) => {
    res.json(req.scope.super ? { super: true } : { super: false, school: { id: req.scope.schoolId, name: req.scope.schoolName } });
  });

  api.get('/admin/classes', admin, async (req, res) => {
    let cq = db(t.classes).orderBy('name');
    if (!req.scope.super) cq = cq.where({ school_id: req.scope.schoolId });
    const classes = await cq;
    const classIds = classes.map(c => c.id);
    const players = classIds.length ? await db(t.players).leftJoin(t.progress, `${t.players}.id`, `${t.progress}.player_id`)
      .whereIn(`${t.players}.class_id`, classIds)
      .select(`${t.players}.*`, `${t.progress}.data`).orderBy(`${t.players}.name`) : [];
    const start = weekStart();
    const week = await db(t.rounds).where('created_at', '>=', start).groupBy('player_id')
      .select('player_id', db.raw('count(*) as n'), db.raw('sum(score) as score'), db.raw('sum(stars) as stars'),
        db.raw("sum(case when mode = 'bubbles' then total else 0 end) as pairs"));
    const weekOf = id => week.find(w => Number(w.player_id) === Number(id)) || {};
    const pulses = {};
    for (const c of classes) {
      const n = players.filter(p => Number(p.class_id) === Number(c.id)).length;
      pulses[c.id] = { n, ...(await classPulse(db, t, c.id, n)) };
    }
    res.json(classes.map(c => {
      const mine = players.filter(p => Number(p.class_id) === Number(c.id));
      const m = missionFor(start, mine.length);
      const pulse = pulses[c.id];
      const progressList = mine.map(p => { try { return sanitizeProgress(p.data ? JSON.parse(p.data) : {}); } catch { return sanitizeProgress({}); } });
      return {
        id: Number(c.id), name: c.name, code: c.code, goal: Number(c.goal), public: !!c.public, focus: c.focus || '', solo: !!c.solo,
        schoolId: c.school_id ? Number(c.school_id) : null,
        mission: { title: m.title(m.goal), unit: m.unit },
        everyone: pulse.everyone, pet: classPetView({ rounds: pulse.rounds, players: pulse.n, recent: pulse.recent }),
        wall: knowledgeWall(progressList),
        players: mine.map(p => {
          let data = {};
          try { data = p.data ? JSON.parse(p.data) : {}; } catch { /* ignoreras */ }
          const prog = sanitizeProgress(data);
          const skill = Object.entries(prog.skill).filter(([k]) => k !== 'g');
          const w = weekOf(p.id);
          const contribution = { pairs: w.pairs, answers: w.score, rounds: w.n, stars: w.stars }[m.id];
          return {
            id: Number(p.id), name: p.name, avatar: p.avatar, hasPin: !!p.pin_hash,
            lastSeen: p.last_seen ? Number(p.last_seen) : null, focus: p.focus || '',
            strong: groupLevels(skill.filter(([, v]) => v >= 7).map(([k]) => k)),
            practice: [
              ...Object.entries(prog.tricky).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => pairText(k)),
              ...groupLevels(skill.filter(([, v]) => v <= 2).map(([k]) => k))
            ],
            training: { rounds: prog.rounds, weekRounds: Number(w.n) || 0, weekAnswers: Number(w.score) || 0 },
            contribution: Number(contribution) || 0,
            ...summarize(data)
          };
        })
      };
    }));
  });

  api.patch('/admin/players/:id', admin, async (req, res) => {
    await ownPlayer(req, req.params.id);
    const focus = req.body?.focus ?? '';
    if (!validFocus(focus)) fail(400, 'Okänt fokus. Använd t.ex. p7, m10 eller d6.');
    const n = await db(t.players).where({ id: Number(req.params.id) }).update({ focus: focus || null });
    if (!n) fail(404, 'Spelaren finns inte.');
    res.json({ ok: true, focus: focus || null, label: focusLabel(focus) });
  });

  api.post('/admin/classes', admin, async (req, res) => {
    const name = cleanName(req.body?.name);
    if (name.length < 1) fail(400, 'Ge klassen ett namn.');
    const goal = Math.max(10, Math.min(100000, Math.floor(Number(req.body?.goal)) || 500));
    let schoolId = req.scope.super ? (Number(req.body?.schoolId) || null) : req.scope.schoolId;
    if (schoolId && !(await db(t.schools).where({ id: schoolId }).first())) fail(400, 'Skolan finns inte.');
    const code = await newCode();
    const id = await insertId(db, client, t.classes, { code, name, goal, school_id: schoolId, created_at: Date.now() });
    res.status(201).json({ id, name, code, goal, schoolId });
  });

  api.patch('/admin/classes/:id', admin, async (req, res) => {
    await ownClass(req, req.params.id);
    const patch = {};
    if (req.body?.schoolId !== undefined) {
      if (!req.scope.super) fail(403, 'Bara huvudadmin kan flytta klasser mellan skolor.');
      const sid = Number(req.body.schoolId) || null;
      if (sid && !(await db(t.schools).where({ id: sid }).first())) fail(400, 'Skolan finns inte.');
      patch.school_id = sid;
    }
    if (req.body?.name != null) patch.name = cleanName(req.body.name);
    if (req.body?.goal != null) patch.goal = Math.max(10, Math.min(100000, Math.floor(Number(req.body.goal)) || 500));
    if (req.body?.public != null) patch.public = !!req.body.public;
    if (req.body?.focus != null) {
      if (!validFocus(req.body.focus)) fail(400, 'Okänt fokus. Använd t.ex. p7, m10 eller d6.');
      patch.focus = req.body.focus || null;
    }
    if (!Object.keys(patch).length) fail(400, 'Inget att ändra.');
    const n = await db(t.classes).where({ id: Number(req.params.id) }).update(patch);
    if (!n) fail(404, 'Klassen finns inte.');
    res.json({ ok: true });
  });

  api.delete('/admin/classes/:id', admin, async (req, res) => {
    await ownClass(req, req.params.id);
    await db(t.classes).where({ id: Number(req.params.id) }).del();
    res.status(204).end();
  });

  api.post('/admin/players/:id/reset-pin', admin, async (req, res) => {
    await ownPlayer(req, req.params.id);
    const id = Number(req.params.id);
    const n = await db(t.players).where({ id }).update({ pin_hash: null, failed: 0, locked_until: null });
    if (!n) fail(404, 'Spelaren finns inte.');
    await db(t.sessions).where({ player_id: id }).del();
    res.json({ ok: true });
  });

  api.delete('/admin/players/:id', admin, async (req, res) => {
    await ownPlayer(req, req.params.id);
    await db(t.players).where({ id: Number(req.params.id) }).del();
    res.status(204).end();
  });

  api.get('/admin/players/:id/rounds', admin, async (req, res) => {
    await ownPlayer(req, req.params.id);
    const rows = await db(t.rounds).where({ player_id: Number(req.params.id) }).orderBy('created_at', 'desc').limit(50);
    res.json(rows.map(r => ({ level: r.level, mode: r.mode, stars: r.stars, score: r.score, total: r.total, mistakes: r.mistakes, at: Number(r.created_at) })));
  });

  /* ---------- Skolor (huvudadmin) ---------- */
  const cleanTitle = v => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 64);
  const schoolKey = () => newToken(); // visas en gång, sparas bara som hash
  api.get('/admin/schools', admin, async (req, res) => {
    let q = db(t.schools).orderBy('name');
    if (!req.scope.super) q = q.where({ id: req.scope.schoolId });
    const schools = await q;
    const counts = await db(t.classes).whereNotNull('school_id').groupBy('school_id').select('school_id', db.raw('count(*) as n'));
    res.json(schools.map(s => ({ id: Number(s.id), name: s.name, classes: Number(counts.find(c => Number(c.school_id) === Number(s.id))?.n) || 0, hasKey: !!s.key_hash })));
  });
  api.post('/admin/schools', admin, superOnly, async (req, res) => {
    const name = cleanTitle(req.body?.name);
    if (name.length < 2) fail(400, 'Ge skolan ett namn.');
    const key = schoolKey();
    const id = await insertId(db, client, t.schools, { name, key_hash: hashToken(key), created_at: Date.now() });
    res.status(201).json({ id, name, key });
  });
  api.post('/admin/schools/:id/key', admin, superOnly, async (req, res) => {
    const key = schoolKey();
    const n = await db(t.schools).where({ id: Number(req.params.id) }).update({ key_hash: hashToken(key) });
    if (!n) fail(404, 'Skolan finns inte.');
    res.json({ key });
  });
  api.patch('/admin/schools/:id', admin, superOnly, async (req, res) => {
    const name = cleanTitle(req.body?.name);
    if (name.length < 2) fail(400, 'Ge skolan ett namn.');
    const n = await db(t.schools).where({ id: Number(req.params.id) }).update({ name });
    if (!n) fail(404, 'Skolan finns inte.');
    res.json({ ok: true });
  });
  api.delete('/admin/schools/:id', admin, superOnly, async (req, res) => {
    // Klasserna finns kvar, men utan skola
    await db(t.schools).where({ id: Number(req.params.id) }).del();
    res.status(204).end();
  });

  /* ---------- Klasskamp (skolans lärare eller huvudadmin) ---------- */
  async function contestClassIds(req, schoolId, ids) {
    const want = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter(Boolean))];
    if (want.length < 2) fail(400, 'Välj minst två klasser.');
    const ok = await db(t.classes).whereIn('id', want).where({ school_id: schoolId, solo: false }).select('id');
    if (ok.length !== want.length) fail(400, 'Alla klasser måste höra till skolan.');
    return want;
  }
  const endsAtOf = v => (v == null || v === '' ? null : Math.max(0, Math.floor(Number(v)) || 0) || null);
  async function ownContest(req, id) {
    const c = await db(t.contests).where({ id: Number(id) || 0 }).first();
    if (!c || (!req.scope.super && Number(c.school_id) !== req.scope.schoolId)) fail(404, 'Klasskampen finns inte.');
    return c;
  }
  api.get('/admin/contests', admin, async (req, res) => {
    let q = db(t.contests).orderBy('id', 'desc');
    if (!req.scope.super) q = q.where({ school_id: req.scope.schoolId });
    const rows = await q;
    res.json(await Promise.all(rows.map(async c => ({ ...(await contestView(db, t, c)), schoolId: Number(c.school_id) }))));
  });
  api.post('/admin/contests', admin, async (req, res) => {
    const schoolId = req.scope.super ? Number(req.body?.schoolId) || 0 : req.scope.schoolId;
    if (!(await db(t.schools).where({ id: schoolId }).first())) fail(400, 'Välj en skola.');
    const metric = req.body?.metric || 'pairs';
    if (!validMetric(metric)) fail(400, 'Okänd sorts kamp.');
    const title = cleanTitle(req.body?.title) || `Skolans ${METRICS[metric].mountain}`;
    const classIds = await contestClassIds(req, schoolId, req.body?.classIds);
    const now = Date.now();
    const id = await insertId(db, client, t.contests, {
      school_id: schoolId, title, metric, active: req.body?.active !== false, starts_at: now, ends_at: endsAtOf(req.body?.endsAt), created_at: now
    });
    await db(t.contestClasses).insert(classIds.map(class_id => ({ contest_id: id, class_id })));
    res.status(201).json(await contestView(db, t, await db(t.contests).where({ id }).first()));
  });
  api.patch('/admin/contests/:id', admin, async (req, res) => {
    const c = await ownContest(req, req.params.id);
    const patch = {};
    if (req.body?.title != null) patch.title = cleanTitle(req.body.title) || c.title;
    if (req.body?.active != null) patch.active = !!req.body.active;
    if (req.body?.endsAt !== undefined) patch.ends_at = endsAtOf(req.body.endsAt);
    if (Object.keys(patch).length) await db(t.contests).where({ id: c.id }).update(patch);
    if (req.body?.classIds) {
      const ids = await contestClassIds(req, Number(c.school_id), req.body.classIds);
      await db.transaction(async trx => {
        await trx(t.contestClasses).where({ contest_id: c.id }).del();
        await trx(t.contestClasses).insert(ids.map(class_id => ({ contest_id: c.id, class_id })));
      });
    }
    res.json(await contestView(db, t, await db(t.contests).where({ id: c.id }).first()));
  });
  api.delete('/admin/contests/:id', admin, async (req, res) => {
    const c = await ownContest(req, req.params.id);
    await db(t.contests).where({ id: c.id }).del();
    res.status(204).end();
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
