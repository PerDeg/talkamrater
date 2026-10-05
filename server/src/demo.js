// Testläget på /test/: samma spel och samma server-kod, men mot en egen databas
// i minnet. Där kan en vuxen se hur t.ex. en inbjudan från en kompis, lärarens
// fokus eller en pågående kompisutmaning ser ut, utan att röra riktiga elever.
// Allt försvinner när servern startar om.
import crypto from 'node:crypto';
import express from 'express';
import { openDatabase, insertId } from './db.js';
import { createApp } from './app.js';
import { newToken, hashToken, newClassCode } from './auth.js';
import { emptyProgress } from './progress.js';
import { classGoal } from './contest.js';

const HOUR = 3600000, DAY = 24 * HOUR;
// Högst så här många testare åt gången. Sedan börjar databasen om från noll.
const MAX_TESTERS = 300;
const AVATARS = ['🐰', '🦊', '🐼', '🐸', '🦁', '🐯', '🐨', '🐵'];

// Vad varje knapp i testläget gör. Texten visas för den som testar.
export const SCENARIOS = {
  invite: 'Alva bjuder in dig till en kompisutmaning',
  sent: 'Du har bjudit in Sam, som inte har svarat än',
  active: 'Du och Alva är mitt i en kompisutmaning',
  almost: 'Kompisutmaningen är nästan klar. Spela en runda så klarar ni den!',
  mateplays: 'Alva spelar en runda (syns i kompisutmaningen och klasskampen)',
  focus: 'Läraren vill att du tränar talkamraterna till 7',
  focusminus: 'Läraren vill att du tränar minus från 10',
  nofocus: 'Läraren tar bort fokus',
  contest: 'Klassens berg är nästan på 75 %. Spela en runda så firar alla!',
  gift: 'En hemlig present till Plutt från klassen',
  cheer: 'Två kompisar hejar på dig',
  reset: 'Börja om med en ny testare'
};

export async function createDemo({ publicDir, tts = null }) {
  const { db, t, client } = await openDatabase({ DB_CLIENT: 'sqlite', SQLITE_FILE: ':memory:', DB_TABLE_PREFIX: 'tk_' });
  const inner = createApp({ db, t, client, tts, adminKey: '', publicDir: null, loginPerMinute: 200 });
  const now = () => Date.now();

  async function player(req) {
    const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
    const s = m && await db(t.sessions).where({ token_hash: hashToken(m[1]) }).first();
    const p = s && await db(t.players).where({ id: s.player_id }).first();
    if (!p) { const e = new Error('Testet har startat om. Ladda om sidan.'); e.status = 401; throw e; }
    return p;
  }
  const addPlayer = (classId, name, avatar) => insertId(db, client, t.players, { class_id: classId, name, avatar, created_at: now(), last_seen: now() });
  const addRound = (playerId, score, ago = HOUR) => insertId(db, client, t.rounds, {
    player_id: playerId, level: '7', mode: 'find', stars: 2, score, total: score, mistakes: 0, created_at: now() - ago
  });
  async function mates(me) {
    const all = await db(t.players).where({ class_id: me.class_id }).whereNot({ id: me.id });
    return { alva: all.find(p => p.name === 'Alva'), sam: all.find(p => p.name === 'Sam') };
  }
  async function clearBuddies(me) {
    await db(t.buddies).where({ from_id: me.id }).orWhere({ to_id: me.id }).del();
  }

  // En ny testare: egen skola med två klasser, tre kompisar och en klasskamp
  async function start(body) {
    const count = await db(t.players).count({ n: '*' }).first();
    if (Number(count.n) > MAX_TESTERS * 4) { await db(t.schools).del(); await db(t.classes).del(); }
    const name = String(body?.name || '').replace(/[<>]/g, '').trim().slice(0, 16) || 'Testaren';
    const avatar = AVATARS.includes(body?.avatar) ? body.avatar : AVATARS[crypto.randomInt(AVATARS.length)];
    const school = await insertId(db, client, t.schools, { name: 'Testskolan', created_at: now() });
    const mine = await insertId(db, client, t.classes, { code: newClassCode() + crypto.randomInt(10), name: 'Testklassen', goal: 300, school_id: school, public: false, created_at: now() });
    const other = await insertId(db, client, t.classes, { code: newClassCode() + crypto.randomInt(10), name: 'Grannklassen', goal: 300, school_id: school, public: false, created_at: now() });
    const me = await addPlayer(mine, name, avatar);
    const alva = await addPlayer(mine, 'Alva', '🦄');
    const sam = await addPlayer(mine, 'Sam', '🐸');
    const nora = await addPlayer(other, 'Nora', '🦊');
    await addPlayer(other, 'Leo', '🐼');
    // Lite som redan har hänt, så att klassen och kampen inte är tomma
    await addRound(alva, 30, 5 * HOUR); await addRound(sam, 20, 3 * HOUR); await addRound(nora, 60, 2 * HOUR);
    const contest = await insertId(db, client, t.contests, { school_id: school, title: 'Skolans svarsberg', metric: 'answers', active: true, starts_at: now() - DAY, ends_at: now() + 6 * DAY, created_at: now() });
    await db(t.contestClasses).insert([{ contest_id: contest, class_id: mine }, { contest_id: contest, class_id: other }]);
    const progress = { ...emptyProgress(), total: 40, rounds: 15, stickers: ['🦊', '🦊', '🐼', '🚀', '🦖'], pet: { ...emptyProgress().pet, xp: 120, last: Math.floor(now() / DAY), name: 'Plutt' },
      best: { '1:find': 3, '2:find': 3, '3:find': 2, '4:find': 1 }, records: { bEarn: 40 },
      // Nyhetsrutorna är redan sedda, så att det man testar syns direkt
      dates: { 'n-mission': 99999, 'n-buddy1': 1, 'n-jump2': 1, 'n-extras1': 1, 'n-stickers2': 1 } };
    await db(t.progress).insert({ player_id: me, data: JSON.stringify(progress), version: 1, updated_at: now() });
    const token = newToken();
    await db(t.sessions).insert({ token_hash: hashToken(token), player_id: me, created_at: now(), last_seen: now() });
    const c = await db(t.classes).where({ id: mine }).first();
    return { token, player: { id: me, name, avatar, className: c.name, classCode: c.code, solo: false, focus: null }, progress, scenarios: SCENARIOS };
  }

  async function scenario(me, id) {
    const { alva, sam } = await mates(me);
    const buddy = (from, to, extra) => insertId(db, client, t.buddies, { from_id: from, to_id: to, metric: 'answers', goal: 40, created_at: now() - 2 * HOUR, ...extra });
    switch (id) {
      case 'invite': await clearBuddies(me); await buddy(alva.id, me.id, { status: 'pending' }); break;
      case 'sent': await clearBuddies(me); await buddy(me.id, sam.id, { status: 'pending' }); break;
      case 'active':
      case 'almost': {
        await clearBuddies(me);
        // Utmaningen börjar nu, så att bara rundorna här under räknas
        const started = now();
        await buddy(alva.id, me.id, { status: 'active', accepted_at: started, ends_at: started + 3 * DAY });
        // Alva och du har redan kommit en bit på vägen
        await addRound(alva.id, id === 'almost' ? 22 : 12, 0);
        await addRound(me.id, id === 'almost' ? 16 : 6, 0);
        break;
      }
      case 'mateplays': await addRound(alva.id, 8, 0); break;
      case 'focus': await db(t.players).where({ id: me.id }).update({ focus: 'p7' }); break;
      case 'focusminus': await db(t.players).where({ id: me.id }).update({ focus: 'm10' }); break;
      case 'nofocus': await db(t.players).where({ id: me.id }).update({ focus: null }); break;
      case 'contest': {
        // Målet beror på klassens storlek. Fyll på så att berget hamnar strax under 75 %.
        const n = await db(t.players).where({ class_id: me.class_id }).count({ n: '*' }).first();
        const goal = classGoal('answers', Number(n.n));
        const k = await db(t.contests).join(t.contestClasses, `${t.contests}.id`, `${t.contestClasses}.contest_id`).where(`${t.contestClasses}.class_id`, me.class_id).select(`${t.contests}.starts_at`).first();
        const have = await db(t.rounds).join(t.players, `${t.rounds}.player_id`, `${t.players}.id`).where(`${t.players}.class_id`, me.class_id)
          .andWhere(`${t.rounds}.created_at`, '>=', Number(k.starts_at)).sum({ v: `${t.rounds}.score` }).first();
        const need = Math.floor(goal * 0.74) - (Number(have.v) || 0);
        if (need > 0) await addRound(sam.id, need, 30 * 60000);
        break;
      }
      case 'gift': await insertId(db, client, t.gifts, { class_id: me.class_id, from_id: sam.id, to_id: me.id, treat: 'glass', seen: false, created_at: now() }); break;
      case 'cheer': {
        const ev = await insertId(db, client, t.events, { class_id: me.class_id, player_id: me.id, type: 'medal', detail: 't-z1', created_at: now() - HOUR });
        await db(t.cheers).insert([{ event_id: ev, player_id: alva.id, created_at: now() }, { event_id: ev, player_id: sam.id, created_at: now() }]);
        break;
      }
      default: { const e = new Error('Okänt test'); e.status = 400; throw e; }
    }
    return SCENARIOS[id];
  }

  const router = express.Router();
  const demoApi = express.Router();
  demoApi.use(express.json({ limit: '4kb' }));
  demoApi.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  demoApi.post('/start', async (req, res, next) => { try { res.json(await start(req.body)); } catch (e) { next(e); } });
  demoApi.post('/scenario', async (req, res, next) => {
    try {
      const me = await player(req);
      res.json({ ok: true, text: await scenario(me, String(req.body?.id || '')) });
    } catch (e) { next(e); }
  });
  demoApi.use((err, req, res, next) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Något gick fel i testläget' });
  });
  router.use('/api/demo', demoApi);
  router.use(inner);
  if (publicDir) {
    router.use(express.static(publicDir, {
      setHeaders(res, file) { if (/\.(html|webmanifest)$|sw\.js$/.test(file)) res.set('Cache-Control', 'no-cache'); }
    }));
  }
  return { router, db, close: () => db.destroy() };
}
