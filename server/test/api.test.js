import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';
import { mergeProgress, sanitizeProgress, summarize } from '../src/progress.js';
import { weekStart, missionFor } from '../src/mission.js';

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
  assert.deepEqual(m.pet, { xp: 30, last: 101, born: 90, name: 'Plutt' });
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
      const app = createApp({ ...opened, adminKey: 'hemlig' });
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

      assert.equal((await call('POST', '/me/rounds', { level: '8', mode: 'find', stars: 3, score: 9, total: 9 }, auth)).status, 204);

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
      assert.equal((await call('POST', '/me/events', { type: 'title', detail: '<script>' }, alvaAuth)).status, 400);
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

      const logout = await call('POST', '/logout', null, { authorization: `Bearer ${fresh.body.token}` });
      assert.equal(logout.status, 204);
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
