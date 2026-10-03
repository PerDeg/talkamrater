import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';
import { mergeProgress, sanitizeProgress } from '../src/progress.js';

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
