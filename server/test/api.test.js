import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';
import { mergeProgress, sanitizeProgress, summarize } from '../src/progress.js';
import { weekStart, missionFor } from '../src/mission.js';
import { classPetView, nudge, petView } from '../src/display.js';

test('mergeProgress tar det bästa från båda', () => {
  const a = { best: { '8:find': 2 }, total: 10, stickers: ['🦖', '🦖', '🐼'], path: { n1: 1 }, tricky: { '8:3': 2 } };
  const b = { best: { '8:find': 3, '9:find': 1 }, total: 7, stickers: ['🦖', '🚀'], path: { n2: 1 }, tricky: {} };
  const m = mergeProgress(a, b);
  assert.deepEqual(m.best, { '8:find': 3, '9:find': 1 });
  assert.equal(m.total, 10);
  assert.deepEqual([...m.stickers].sort(), ['🐼', '🚀', '🦖', '🦖'].sort());
  assert.deepEqual(m.path, { n1: 1, n2: 1 });
  assert.deepEqual(m.tricky, {});
});

test('husdjur och dagens utmaning slås ihop rätt', () => {
  const a = { pet: { xp: 30, last: 100, born: 90, name: 'Plutt' }, daily: { day: 100, streak: 4, best: 6, count: 20 } };
  const b = { pet: { xp: 12, last: 101, born: 95, name: '' }, daily: { day: 101, streak: 1, best: 2, count: 3 } };
  const m = mergeProgress(a, b);
  assert.deepEqual({ ...m.pet }, { xp: 30, last: 101, born: 90, name: 'Plutt', wish: null, wishDay: 0, wishCount: 0, treats: 0, wear: '' });
  assert.deepEqual(m.daily, { day: 101, streak: 1, best: 6, count: 20 });
  const s = summarize({ path: { 't-z1': 9, 't-mz1': 8, mexpert: 1 } });
  assert.equal(s.medals, 2);
  assert.deepEqual(s.experts, ['minus']);
});

test('veckans uppdrag börjar på måndag och skalar med klassen', () => {
  const ws = new Date(weekStart(new Date(2026, 9, 3, 15, 0)));
  assert.equal(ws.getDay(), 1);
  assert.equal(ws.getDate(), 28);
  assert.ok(missionFor(ws.getTime(), 25).goal > missionFor(ws.getTime(), 2).goal);
});

test('bytta klistermärken räknas uppåt och kommer inte tillbaka', () => {
  const m = mergeProgress({ stickers: ['🦊', '🦊', '🦊'], swapped: { s3: 1 } }, { stickers: ['🦊', '🦊', '🦊'], swapped: { s3: 2, x: 5, s9999: 1 } });
  assert.deepEqual(m.swapped, { s3: 2 });
  assert.equal(m.stickers.length, 3);
});

test('husdjurets kläder: senaste vinner, skräp rensas', () => {
  const m = mergeProgress({ pet: { wear: 'keps' } }, { pet: { wear: 'mantel,<script>,solglas' } });
  assert.equal(m.pet.wear, 'mantel,solglas');
  assert.equal(mergeProgress({ pet: { wear: 'keps' } }, { pet: {} }).pet.wear, 'keps');
  assert.equal(mergeProgress({ pet: { wear: 'keps' } }, { pet: { wear: 'none' } }).pet.wear, 'none');
  assert.deepEqual(mergeProgress({ swapped: { g3: 1 } }, { swapped: { g3: 2 } }).swapped, { g3: 2 });
});

test('tio steg för husdjuret, kung långt bort', () => {
  assert.equal(petView({ xp: 400, last: 100 }, 100).stageName, 'Skolplutt'); // förr kung, nu steg 5 av 10
  assert.equal(petView({ xp: 2500, last: 100 }, 100).stageName, 'Kung');
  assert.equal(petView({ xp: 4000, last: 100 }, 100).nextAt, null);
  assert.match(nudge({ pet: { xp: 30, last: 1 }, today: 100 }).text, /Bu-hu/);
  assert.equal(nudge({ pet: { xp: 30, last: 100 }, gift: 'st:s3', today: 100 }).kind, 'gift');
});

test('global färdighet och datum sparas och slås ihop', () => {
  const m = mergeProgress({ skill: { g: 8 }, dates: { 't-z1': 20000 } }, { skill: { g: 5, p3: 2 }, dates: { 't-z1': 19990, 't-z2': 20010 } });
  assert.deepEqual(m.skill, { g: 5, p3: 2 });
  assert.deepEqual(m.dates, { 't-z1': 20000, 't-z2': 20010 });
});

test('klassens husdjur växer per elev och humöret följer hur många som spelat', () => {
  assert.equal(classPetView({ rounds: 0, players: 20, recent: 0 }).stage, 0);
  const p = classPetView({ rounds: 130, players: 20, recent: 12 });
  assert.equal(p.stage, 2);
  assert.equal(p.mood, 'överlycklig');
  assert.equal(p.nextAt, 300);
  assert.equal(classPetView({ rounds: 130, players: 20, recent: 1 }).mood, 'längtar');
});

test('pratbubblan: present först, alla med i rotationen', () => {
  const pet = { xp: 50, last: 100 };
  assert.equal(nudge({ pet, gift: 'glass', today: 100 }).kind, 'gift');
  assert.match(nudge({ pet, gift: 'glass', today: 100 }).text, /glass/);
  const kinds = new Set();
  for (let h = 0; h < 24; h += 2) kinds.add(nudge({ pet, daily: { day: 100 }, everyone: { allIn: true, players: 3 }, today: 100, now: new Date(2026, 0, 1, h) }).kind);
  assert.ok(kinds.has('allin'));
});

test('sanitizeProgress rensar skräp', () => {
  const s = sanitizeProgress({ best: { 'x y': 3, '8:find': 99 }, total: -5, stickers: [1, 'ok'], evil: true });
  assert.deepEqual(s.best, { '8:find': 3 });
  assert.equal(s.total, 0);
  assert.deepEqual(s.stickers, ['ok']);
  assert.equal(s.evil, undefined);
});

const targets = [['sqlite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-'));
  return { DB_CLIENT: 'sqlite', SQLITE_FILE: path.join(dir, 'test.db') };
}]];
if (process.env.TEST_PG_URL) targets.push(['postgres', () => ({ DB_CLIENT: 'postgres', DATABASE_URL: process.env.TEST_PG_URL, DB_TABLE_PREFIX: `t${Date.now() % 100000}_` })]);
if (process.env.TEST_MYSQL_URL) targets.push(['mysql', () => ({ DB_CLIENT: 'mysql', DATABASE_URL: process.env.TEST_MYSQL_URL, DB_TABLE_PREFIX: `t${Date.now() % 100000}_` })]);

for (const [label, envFor] of targets) {
  describe(`API mot ${label}`, () => {
    let server, base, db;
    const call = async (method, url, body, headers = {}) => {
      const r = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
      const text = await r.text();
      return { status: r.status, body: text ? JSON.parse(text) : null };
    };
    const ADMIN = { 'x-admin-key': 'hemlig' };

    before(async () => {
      const opened = await openDatabase(envFor());
      db = opened.db;
      const app = createApp({ ...opened, adminKey: 'hemlig', loginPerMinute: 500 });
      server = await new Promise(res => { const s = app.listen(0, () => res(s)); });
      base = `http://127.0.0.1:${server.address().port}/api`;
    });
    after(async () => { server.close(); await db.destroy(); });

    test('hela flödet: klass, ny spelare, inloggning, framsteg, klassida', async () => {
      assert.equal((await call('GET', '/health')).body.app, 'talkamrater');
      assert.equal((await call('GET', '/admin/classes')).status, 401);

      const cls = await call('POST', '/admin/classes', { name: 'Klass 2B', goal: 300 }, ADMIN);
      assert.equal(cls.status, 201);
      const code = cls.body.code;
      assert.match(code, /^[A-Z]+-\d{4}$/);

      const lookup = await call('GET', `/classes/${code.toLowerCase().replace('-', '')}`);
      assert.equal(lookup.body.class.name, 'Klass 2B');

      const reg = await call('POST', `/classes/${code}/players`, { name: 'Edwin', avatar: '🐲', pin: [1, 2, 3] });
      assert.equal(reg.status, 201);
      assert.equal(reg.body.player.avatar, '🐲');
      const auth = { authorization: `Bearer ${reg.body.token}` };

      const dup = await call('POST', `/classes/${code}/players`, { name: 'edwin', pin: [1, 2, 3] });
      assert.equal(dup.status, 409);

      const put = await call('PUT', '/me/progress', { progress: { total: 5, stickers: ['🦖'], best: { '8:find': 2 } } }, auth);
      assert.equal(put.body.progress.total, 5);
      const put2 = await call('PUT', '/me/progress', { progress: { total: 3, stickers: ['🚀'], best: { '8:find': 3 } } }, auth);
      assert.equal(put2.body.progress.total, 5);
      assert.equal(put2.body.progress.stickers.length, 2);

      const rr = await call('POST', '/me/rounds', { level: '8', mode: 'bubbles', stars: 3, score: 9, total: 5 }, auth);
      assert.equal(rr.status, 200);
      assert.ok(rr.body.mission.mine > 0);

      const id = reg.body.player.id;
      const bad = await call('POST', '/login', { code, playerId: id, pin: [3, 2, 1] });
      assert.equal(bad.status, 401);
      const good = await call('POST', '/login', { code, playerId: id, pin: [1, 2, 3] });
      assert.equal(good.status, 200);
      assert.equal(good.body.progress.total, 5);

      await call('POST', `/classes/${code}/players`, { name: 'Alva', avatar: '🦄', pin: [4, 4, 4] });
      const wall = await call('GET', '/me/class', null, auth);
      assert.equal(wall.body.players.length, 2);
      assert.equal(wall.body.total, 5);
      assert.ok(wall.body.players.find(p => p.name === 'Edwin').me);

      const adm = await call('GET', '/admin/classes', null, ADMIN);
      assert.equal(adm.body[0].players.length, 2);

      // Nollställd kod: nästa inloggning sätter en ny kod
      assert.equal((await call('POST', `/admin/players/${id}/reset-pin`, null, ADMIN)).status, 200);
      assert.equal((await call('GET', '/me', null, auth)).status, 401);
      const fresh = await call('POST', '/login', { code, playerId: id, pin: [9, 9, 9] });
      assert.equal(fresh.status, 200);
      assert.equal((await call('POST', '/login', { code, playerId: id, pin: [9, 9, 9] })).status, 200);

      // Händelser, hejarop och veckans uppdrag
      const alva = await call('POST', '/login', { code, playerId: (await call('GET', `/classes/${code}`)).body.players.find(p => p.name === 'Alva').id, pin: [4, 4, 4] });
      const alvaAuth = { authorization: `Bearer ${alva.body.token}` };
      const ev = await call('POST', '/me/events', { type: 'medal', detail: 't-z1' }, alvaAuth);
      assert.equal(ev.status, 201);
      assert.equal((await call('POST', '/me/events', { type: 'medal', detail: 't-z1' }, alvaAuth)).body.duplicate, true);
      assert.equal((await call('POST', '/me/events', { type: 'hack', detail: 'x' }, alvaAuth)).status, 400);
      assert.equal((await call('POST', '/me/events', { type: 'medal', detail: '<script>' }, alvaAuth)).status, 400);
      assert.equal((await call('POST', '/me/events', { type: 'title', detail: 'Talkompis' }, alvaAuth)).status, 400);
      const meAuth = { authorization: `Bearer ${fresh.body.token}` };
      assert.equal((await call('POST', `/events/${ev.body.id}/cheer`, null, meAuth)).body.cheers, 1);
      assert.equal((await call('POST', `/events/${ev.body.id}/cheer`, null, meAuth)).body.cheers, 1);
      assert.equal((await call('POST', `/events/${ev.body.id}/cheer`, null, alvaAuth)).status, 400);
      await call('POST', '/me/rounds', { level: '8', mode: 'bubbles', stars: 3, score: 5, total: 5 }, meAuth);
      const wall2 = await call('GET', '/me/class', null, alvaAuth);
      assert.equal(wall2.body.events.length, 1);
      assert.equal(wall2.body.events[0].cheers, 1);
      assert.equal(wall2.body.events[0].mine, true);
      assert.equal(wall2.body.myCheers, 1);
      assert.ok(wall2.body.mission.goal > 0);
      assert.ok(wall2.body.mission.progress > 0);

      // Lärarens fokus: klassen och eleven
      assert.equal((await call('PATCH', `/admin/classes/${cls.body.id}`, { focus: 'p7' }, ADMIN)).status, 200);
      assert.equal((await call('PATCH', `/admin/players/${id}`, { focus: 'x99' }, ADMIN)).status, 400);
      assert.equal((await call('GET', '/me', null, { authorization: `Bearer ${fresh.body.token}` })).body.player.focus, 'p7');
      assert.equal((await call('PATCH', `/admin/players/${id}`, { focus: 'm10' }, ADMIN)).body.label, 'minus från 10');
      assert.equal((await call('GET', '/me', null, { authorization: `Bearer ${fresh.body.token}` })).body.player.focus, 'm10');
      await call('PUT', '/me/progress', { progress: { skill: { p8: 9, p3: 1 }, tricky: { '8:3': 4 } } }, { authorization: `Bearer ${fresh.body.token}` });
      const adm2 = await call('GET', '/admin/classes', null, ADMIN);
      const edw = adm2.body.find(c => c.code === code).players.find(p => p.name === 'Edwin');
      assert.deepEqual(edw.strong, ['Plus: 8']);
      assert.ok(edw.practice.includes('3+5=8'));
      assert.equal(edw.focus, 'm10');
      assert.ok(edw.training.weekRounds >= 1);

      // Flera fokus samtidigt, och läraren ser vem som tränat på dem
      const fa = { authorization: `Bearer ${fresh.body.token}` };
      assert.equal((await call('PATCH', `/admin/players/${id}`, { focus: 'p7,m10,p7,d5' }, ADMIN)).body.label, 'talkamraterna till 7, minus från 10 och dubblorna upp till 5');
      assert.equal((await call('PATCH', `/admin/players/${id}`, { focus: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] }, ADMIN)).status, 400);
      assert.equal((await call('PATCH', `/admin/players/${id}`, { focus: ['p7', 'm10'] }, ADMIN)).body.focus, 'p7,m10');
      assert.equal((await call('GET', '/me', null, fa)).body.player.focus, 'p7,m10');
      await call('POST', '/me/rounds', { level: '7', mode: 'find', stars: 3, score: 9, total: 10 }, fa);
      await call('POST', '/me/rounds', { level: '7', mode: 'bubbles', stars: 2, score: 4, total: 5 }, fa);
      await call('POST', '/me/rounds', { level: '9', mode: 'find', stars: 3, score: 9, total: 10 }, fa);
      const fEdw = (await call('GET', '/admin/classes', null, ADMIN)).body.find(c => c.code === code).players.find(p => p.name === 'Edwin');
      assert.deepEqual(fEdw.focusDone.map(f => [f.focus, f.rounds, f.answers]), [['p7', 2, 13], ['m10', 0, 0]]);
      // Tar läraren bort elevens eget fokus gäller klassens igen
      await call('PATCH', `/admin/players/${id}`, { focus: '' }, ADMIN);
      assert.equal((await call('GET', '/me', null, fa)).body.player.focus, 'p7');

      // Publik klassstatus: av tills läraren slår på den
      assert.equal((await call('GET', `/public/classes/${code}?name=Edwin`)).status, 404);
      assert.equal((await call('PATCH', `/admin/classes/${cls.body.id}`, { public: true }, ADMIN)).status, 200);
      const pub = await call('GET', `/public/classes/${code}?name=edwin`);
      assert.equal(pub.status, 200);
      assert.equal(pub.body.me.name, 'Edwin');
      assert.equal(pub.body.me.pet.stageName, 'Ägg');
      assert.equal(pub.body.me.nudge.kind, 'egg');
      assert.ok(pub.body.playUrl.endsWith(`?klass=${code}`));
      assert.equal(typeof pub.body.mission.percent, 'number');
      assert.equal(pub.body.class.players, 2);
      assert.ok(pub.body.mission.goal > 0);
      assert.equal((await call('GET', `/public/classes/${code}?name=Okänd`)).body.nameNotFound, true);

      // Klassen klarar veckans uppdrag: en händelse, bara en gång
      const meAuth2 = { authorization: `Bearer ${fresh.body.token}` };
      let done = 0;
      for (let i = 0; i < 35; i++) {
        const r = await call('POST', '/me/rounds', { level: '8', mode: 'bubbles', stars: 3, score: 1000, total: 1000 }, meAuth2);
        if (r.body.completed) done++;
      }
      assert.equal(done, 1);
      const wall3 = await call('GET', '/me/class', null, meAuth2);
      assert.equal(wall3.body.events.filter(e => e.type === 'mission').length, 1);

      // Kunskapsväggen och klassens husdjur
      assert.equal(wall3.body.wall.p8, 1);
      assert.equal(wall3.body.wall.p3, undefined);
      assert.ok(wall3.body.pet.stage >= 1);
      assert.equal(wall3.body.mission.everyone.players, 2);
      assert.equal(wall3.body.mission.everyone.contributed, 1);
      assert.equal(wall3.body.mission.everyone.allIn, false);

      // Alla med: när Alva också spelar är hela klassen med, en händelse per vecka
      const ar = await call('POST', '/me/rounds', { level: '5', mode: 'find', stars: 2, score: 4, total: 6 }, alvaAuth);
      assert.equal(ar.body.mission.everyone.allIn, true);
      assert.equal(ar.body.allIn, true);
      assert.equal((await call('POST', '/me/rounds', { level: '5', mode: 'find', stars: 2, score: 4, total: 6 }, alvaAuth)).body.allIn, false);
      const wall4 = await call('GET', '/me/class', null, meAuth2);
      assert.equal(wall4.body.events.filter(e => e.type === 'allin').length, 1);

      // Hemliga presenter: en per dag, mottagaren ser den tills den markerats som sedd
      assert.equal((await call('POST', '/me/gift', { treat: 'gift' }, alvaAuth)).status, 400);
      const g1 = await call('POST', '/me/gift', { treat: 'glass' }, alvaAuth);
      assert.equal(g1.status, 201);
      assert.equal((await call('POST', '/me/gift', { treat: 'kaka' }, alvaAuth)).body.reason, 'today');
      const got = await call('GET', '/me/class', null, meAuth2);
      assert.deepEqual(got.body.gifts.map(g => g.treat), ['glass']);
      assert.equal(got.body.gifts[0].from, undefined);
      await call('PUT', '/me/progress', { progress: { pet: { xp: 20, last: 1 } } }, meAuth2);
      assert.equal((await call('GET', `/public/classes/${code}?name=Edwin`)).body.me.nudge.kind, 'gift');
      assert.equal((await call('POST', '/me/gifts/seen', null, meAuth2)).body.seen, 1);
      assert.equal((await call('GET', '/me/class', null, meAuth2)).body.gifts.length, 0);
      const pub2 = await call('GET', `/public/classes/${code}?name=Edwin`);
      assert.notEqual(pub2.body.me.nudge.kind, 'gift');
      assert.ok(pub2.body.class.pet.name);
      assert.equal(pub2.body.mission.everyone.allIn, true);
      const adm3 = (await call('GET', '/admin/classes', null, ADMIN)).body.find(c => c.code === code);
      assert.equal(adm3.everyone.contributed, 2);
      assert.equal(adm3.wall.p8, 1);

      const logout = await call('POST', '/logout', null, { authorization: `Bearer ${fresh.body.token}` });
      assert.equal(logout.status, 204);
    });

    test('eget konto utan klass, och sedan med i en klass', async () => {
      const acc = await call('POST', '/accounts', { name: 'Vera', avatar: '🦊', pin: [5, 6, 7] });
      assert.equal(acc.status, 201);
      assert.match(acc.body.code, /^[A-Z]+-\d{4}$/);
      assert.equal(acc.body.player.solo, true);
      assert.equal(acc.body.player.className, null);
      const auth = { authorization: `Bearer ${acc.body.token}` };
      await call('PUT', '/me/progress', { progress: { total: 12, stickers: ['🦖'] } }, auth);
      // Logga in på en annan enhet med den egna koden
      const look = await call('GET', `/classes/${acc.body.code}`);
      assert.equal(look.body.class.solo, true);
      assert.equal(look.body.players.length, 1);
      assert.equal((await call('POST', `/classes/${acc.body.code}/players`, { name: 'Inkräktare', pin: [1, 1, 1] })).status, 400);
      const login = await call('POST', '/login', { code: acc.body.code, playerId: look.body.players[0].id, pin: [5, 6, 7] });
      assert.equal(login.status, 200);
      assert.equal(login.body.progress.total, 12);
      // Syns inte bland klasserna och kan inte visas publikt
      const adm = await call('GET', '/admin/classes', null, ADMIN);
      assert.equal(adm.body.find(c => c.code === acc.body.code).solo, true);
      assert.equal((await call('GET', `/public/classes/${acc.body.code}?name=Vera`)).status, 404);
      // Går med i en klass: allt följer med, den egna koden försvinner
      const cls = await call('POST', '/admin/classes', { name: 'Klass 3A' }, ADMIN);
      assert.equal((await call('POST', '/me/join', { code: acc.body.code }, auth)).status, 400);
      const joined = await call('POST', '/me/join', { code: cls.body.code }, auth);
      assert.equal(joined.status, 200);
      assert.equal(joined.body.player.solo, false);
      assert.equal(joined.body.player.className, 'Klass 3A');
      assert.equal((await call('GET', '/me', null, auth)).body.progress.total, 12);
      assert.equal((await call('GET', `/classes/${acc.body.code}`)).status, 404);
      assert.equal((await call('POST', '/me/join', { code: cls.body.code }, auth)).status, 400);
      // Namnkrock när ett till eget konto vill in
      const acc2 = await call('POST', '/accounts', { name: 'vera', pin: [1, 2, 3] });
      const a2 = { authorization: `Bearer ${acc2.body.token}` };
      assert.equal((await call('POST', '/me/join', { code: cls.body.code }, a2)).status, 409);
      assert.equal((await call('POST', '/me/join', { code: cls.body.code, name: 'Vera B' }, a2)).body.player.name, 'Vera B');
    });

    test('skolor, lärarnycklar och klasskamp', async () => {
      // Huvudadmin skapar en skola och får en lärarnyckel en gång
      const sch = await call('POST', '/admin/schools', { name: 'Ängsskolan' }, ADMIN);
      assert.equal(sch.status, 201);
      const TEACH = { 'x-admin-key': sch.body.key };
      assert.deepEqual((await call('GET', '/admin/me', null, TEACH)).body, { super: false, school: { id: sch.body.id, name: 'Ängsskolan' } });
      assert.equal((await call('POST', '/admin/schools', { name: 'Fusk' }, TEACH)).status, 403);
      assert.equal((await call('GET', '/admin/me', null, { 'x-admin-key': 'x'.repeat(40) })).status, 401);
      // Läraren skapar klasser i sin skola och ser bara dem
      const a = await call('POST', '/admin/classes', { name: '2A' }, TEACH);
      const b = await call('POST', '/admin/classes', { name: '2B' }, TEACH);
      const other = await call('POST', '/admin/classes', { name: 'Annan skola' }, ADMIN);
      assert.equal(a.body.schoolId, sch.body.id);
      const mine = (await call('GET', '/admin/classes', null, TEACH)).body;
      assert.deepEqual(mine.map(c => c.name), ['2A', '2B']);
      assert.equal((await call('PATCH', `/admin/classes/${other.body.id}`, { goal: 99 }, TEACH)).status, 404);
      assert.equal((await call('DELETE', `/admin/classes/${other.body.id}`, null, TEACH)).status, 404);
      assert.equal((await call('PATCH', `/admin/classes/${a.body.id}`, { schoolId: null }, TEACH)).status, 403);
      // Elever i båda klasserna
      const reg = async (code, name) => (await call('POST', `/classes/${code}/players`, { name, pin: [1, 2, 3] })).body;
      const ea = await reg(a.body.code, 'Ella'), eb = await reg(b.body.code, 'Bo');
      const authA = { authorization: `Bearer ${ea.token}` }, authB = { authorization: `Bearer ${eb.token}` };
      // Kampen kräver klasser från skolan
      assert.equal((await call('POST', '/admin/contests', { classIds: [a.body.id, other.body.id] }, TEACH)).status, 400);
      assert.equal((await call('POST', '/admin/contests', { classIds: [a.body.id] }, TEACH)).status, 400);
      const k = await call('POST', '/admin/contests', { metric: 'pairs', classIds: [b.body.id, a.body.id] }, TEACH);
      assert.equal(k.status, 201);
      assert.equal(k.body.title, 'Skolans bubbelberg');
      assert.deepEqual(k.body.classes.map(c => c.name), ['2A', '2B']); // bokstavsordning
      assert.equal(k.body.classes[0].goal, 200); // 40 per elev, minst 5 elever
      // 2A bygger halva sitt berg: händelse i båda klassernas flöde, bara en gång
      const r1 = await call('POST', '/me/rounds', { level: '9', mode: 'bubbles', stars: 3, score: 100, total: 100 }, authA);
      assert.deepEqual(r1.body.contest.reached, [25, 50]);
      assert.equal(r1.body.contest.percent, 50);
      const r2 = await call('POST', '/me/rounds', { level: '9', mode: 'find', stars: 3, score: 5, total: 5 }, authA);
      assert.deepEqual(r2.body.contest.reached, []);
      const cb = (await call('GET', '/me/class', null, authB)).body;
      assert.equal(cb.contest.title, 'Skolans bubbelberg');
      assert.equal(cb.contest.total, 100);
      assert.ok(cb.contest.classes.find(c => c.name === '2B').mine);
      const ev = cb.events.filter(e => e.type === 'contest');
      assert.equal(ev.length, 2);
      // Publikt: hejande mening om den andra klassen
      await call('PATCH', `/admin/classes/${b.body.id}`, { public: true }, TEACH);
      const pub = (await call('GET', `/public/classes/${b.body.code}?name=Bo&events=5`)).body;
      assert.equal(pub.contest.text, '2A har byggt 50 % av sitt bubbelberg. Nu kör vi! 🏔️');
      assert.ok(pub.events.some(e => e.text === '2A har byggt halva sitt berg! 🏔️'));
      // Läraren pausar kampen: den försvinner för eleverna
      assert.equal((await call('PATCH', `/admin/contests/${k.body.id}`, { active: false }, TEACH)).body.active, false);
      assert.equal((await call('GET', '/me/class', null, authB)).body.contest, null);
      assert.equal((await call('GET', '/admin/contests', null, TEACH)).body.length, 1);
      // Huvudadmin raderar skolan: klasserna finns kvar utan skola
      assert.equal((await call('DELETE', `/admin/schools/${sch.body.id}`, null, ADMIN)).status, 204);
      assert.equal((await call('GET', '/admin/me', null, TEACH)).status, 401);
      const all = (await call('GET', '/admin/classes', null, ADMIN)).body;
      assert.equal(all.find(c => c.name === '2A').schoolId, null);
    });

    test('kompisutmaning: bjuda in, avbryta, svara, klara och hämta bricka', async () => {
      const sch = await call('POST', '/admin/schools', { name: 'Kompisskolan' }, ADMIN);
      const T = { 'x-admin-key': sch.body.key };
      const a = await call('POST', '/admin/classes', { name: '1A' }, T);
      const b = await call('POST', '/admin/classes', { name: '1B' }, T);
      const other = await call('POST', '/admin/classes', { name: 'Annan' }, ADMIN);
      const reg = async (code, name) => (await call('POST', `/classes/${code}/players`, { name, pin: [1, 2, 3] })).body;
      const ida = await reg(a.body.code, 'Ida'), olle = await reg(b.body.code, 'Olle'), sam = await reg(a.body.code, 'Sam'), ute = await reg(other.body.code, 'Ute');
      const H = p => ({ authorization: `Bearer ${p.token}` });
      // Kompisar: hela skolan, egen klass först, aldrig andra skolor
      const list = (await call('GET', '/me/buddies', null, H(ida))).body;
      assert.deepEqual(list.mates.map(m => m.name), ['Sam', 'Olle']);
      assert.equal(list.challenge, null);
      assert.equal((await call('POST', '/me/challenge', { toId: ute.player.id, metric: 'answers' }, H(ida))).status, 400);
      assert.equal((await call('POST', '/me/challenge', { toId: olle.player.id, metric: 'hack' }, H(ida))).status, 400);
      // Ida bjuder in Olle och ångrar sig
      let c = (await call('POST', '/me/challenge', { toId: olle.player.id, metric: 'answers' }, H(ida))).body.challenge;
      assert.equal(c.status, 'pending'); assert.equal(c.role, 'from'); assert.equal(c.mate.name, 'Olle');
      assert.equal((await call('POST', '/me/challenge', { toId: sam.player.id, metric: 'answers' }, H(ida))).status, 400); // bara en åt gången
      assert.equal((await call('POST', '/me/challenge', { toId: olle.player.id, metric: 'pairs' }, H(sam))).status, 400); // Olle är upptagen
      assert.equal((await call('POST', `/me/challenge/${c.id}/cancel`, null, H(olle))).status, 400); // mottagaren svarar i stället
      assert.equal((await call('POST', `/me/challenge/${c.id}/cancel`, null, H(ida))).body.challenge, null);
      assert.equal((await call('GET', '/me/buddies', null, H(olle))).body.challenge, null);
      // Ny inbjudan som Olle tackar ja till
      c = (await call('POST', '/me/challenge', { toId: olle.player.id, metric: 'answers' }, H(ida))).body.challenge;
      const inv = (await call('GET', '/me/buddies', null, H(olle))).body.challenge;
      assert.equal(inv.role, 'to'); assert.equal(inv.mate.name, 'Ida');
      await call('PATCH', `/admin/classes/${b.body.id}`, { public: true }, T);
      assert.equal((await call('GET', `/public/classes/${b.body.code}?name=Olle`)).body.me.nudge.kind, 'egg'); // ägget går före
      const acc = (await call('POST', `/me/challenge/${inv.id}/accept`, null, H(olle))).body.challenge;
      assert.equal(acc.status, 'active'); assert.equal(acc.goal, 40);
      // Båda spelar: 25 + 20 rätt klarar 40
      let r = await call('POST', '/me/rounds', { level: '8', mode: 'find', stars: 2, score: 25, total: 25 }, H(ida));
      assert.equal(r.body.buddy.progress, 25); assert.equal(r.body.buddy.justDone, false);
      r = await call('POST', '/me/rounds', { level: '8', mode: 'find', stars: 2, score: 20, total: 20 }, H(olle));
      assert.equal(r.body.buddy.justDone, true); assert.equal(r.body.buddy.progress, 45);
      assert.equal(r.body.buddy.mine, 20); assert.equal(r.body.buddy.theirs, 25);
      const feedA = (await call('GET', '/me/class', null, H(ida))).body.events.filter(e => e.type === 'buddy');
      const feedB = (await call('GET', '/me/class', null, H(olle))).body.events.filter(e => e.type === 'buddy');
      assert.equal(feedA.length, 1); assert.equal(feedB.length, 1);
      assert.ok((await call('GET', `/public/classes/${b.body.code}?name=Olle&events=3`)).body.events.some(e => e.text === 'Ida och Olle klarade en kompisutmaning 🤝'));
      // Brickan hämtas en gång var
      const done = (await call('GET', '/me/buddies', null, H(ida))).body.challenge;
      assert.equal(done.status, 'done'); assert.equal(done.claimed, false);
      assert.equal((await call('POST', `/me/challenge/${done.id}/claim`, null, H(ida))).body.already, false);
      assert.equal((await call('POST', `/me/challenge/${done.id}/claim`, null, H(ida))).body.already, true);
      assert.equal((await call('GET', '/me/buddies', null, H(ida))).body.challenge.claimed, true);
      assert.equal((await call('POST', `/me/challenge/${done.id}/seen`, null, H(ida))).body.challenge, null);
      assert.equal((await call('GET', '/me/buddies', null, H(olle))).body.challenge.status, 'done');
      // Nej tack
      c = (await call('POST', '/me/challenge', { toId: sam.player.id, metric: 'rounds' }, H(ida))).body.challenge;
      assert.equal((await call('POST', `/me/challenge/${c.id}/decline`, null, H(sam))).body.challenge, null);
      assert.equal((await call('GET', '/me/buddies', null, H(ida))).body.challenge.status, 'declined');
      assert.equal((await call('POST', `/me/challenge/${c.id}/seen`, null, H(ida))).body.challenge, null);
      assert.equal((await call('POST', `/me/challenge/${c.id}/accept`, null, H(ute))).status, 404);
    });

    test('dela en dubblett med klassen: går till någon som saknar den', async () => {
      const cls = await call('POST', '/admin/classes', { name: 'Delklassen' }, ADMIN);
      const reg = async name => (await call('POST', `/classes/${cls.body.code}/players`, { name, pin: [1, 2, 3] })).body;
      const ann = await reg('Ann'), ben = await reg('Ben'), cia = await reg('Cia');
      const H = p => ({ authorization: `Bearer ${p.token}` });
      await call('PUT', '/me/progress', { progress: { stickers: ['🦊'] } }, H(ben));
      assert.equal((await call('POST', '/me/share', { e: '🦊', id: 'x3' }, H(ann))).status, 400);
      // Ben har räven, så den går till Cia
      assert.equal((await call('POST', '/me/share', { e: '🦊', id: 's3' }, H(ann))).body.sent, true);
      const got = (await call('GET', '/me/class', null, H(cia))).body.gifts;
      assert.deepEqual(got.map(g => g.treat), ['st:s3']);
      // Nu har alla den (Cias är på väg)
      assert.equal((await call('POST', '/me/share', { e: '🦊', id: 's3' }, H(ann))).body.reason, 'everyone');
      // Att dela räknas inte som dagens matpresent
      assert.equal((await call('POST', '/me/gift', { treat: 'glass' }, H(ann))).status, 201);
      await call('PATCH', `/admin/classes/${cls.body.id}`, { public: true }, ADMIN);
      await call('PUT', '/me/progress', { progress: { pet: { xp: 30, last: 1 } } }, H(cia));
      assert.match((await call('GET', `/public/classes/${cls.body.code}?name=Cia`)).body.me.nudge.text, /klistermärke/);
    });

    test('låser efter fem fel', async () => {
      const cls = await call('POST', '/admin/classes', { name: 'Låsklass' }, ADMIN);
      const reg = await call('POST', `/classes/${cls.body.code}/players`, { name: 'Testa', pin: [0, 0, 0] });
      let r;
      for (let i = 0; i < 5; i++) r = await call('POST', '/login', { code: cls.body.code, playerId: reg.body.player.id, pin: [1, 1, 1] });
      assert.match(r.body.error, /För många fel/);
      r = await call('POST', '/login', { code: cls.body.code, playerId: reg.body.player.id, pin: [0, 0, 0] });
      assert.equal(r.status, 423);
    });
  });
}
