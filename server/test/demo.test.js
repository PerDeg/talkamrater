import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createDemo } from '../src/demo.js';

test('testläget: egen databas, påhittad klass och knappar för olika lägen', async () => {
  const demo = await createDemo({ publicDir: null });
  const app = express();
  app.use('/test', demo.router);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/test/api`;
  const call = async (method, path, body, token) => {
    const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  try {
    const s = (await call('POST', '/demo/start', { name: 'Pappa' })).body;
    assert.equal(s.player.name, 'Pappa');
    assert.equal(s.player.className, 'Testklassen');
    const tk = s.token;

    // En inbjudan från Alva
    await call('POST', '/demo/scenario', { id: 'invite' }, tk);
    let c = (await call('GET', '/me/buddies', null, tk)).body.challenge;
    assert.equal(c.status, 'pending');
    assert.equal(c.role, 'to');
    assert.equal(c.mate.name, 'Alva');

    // Pågående utmaning, och Alva spelar en runda
    await call('POST', '/demo/scenario', { id: 'active' }, tk);
    c = (await call('GET', '/me/buddies', null, tk)).body.challenge;
    assert.equal(c.status, 'active');
    const before = c.progress;
    assert.ok(before > 0);
    await call('POST', '/demo/scenario', { id: 'mateplays' }, tk);
    assert.ok((await call('GET', '/me/buddies', null, tk)).body.challenge.progress > before);

    // Nästan klar: en runda till klarar utmaningen
    await call('POST', '/demo/scenario', { id: 'almost' }, tk);
    assert.equal((await call('GET', '/me/buddies', null, tk)).body.challenge.progress, 38);
    const r = await call('POST', '/me/rounds', { level: '7', mode: 'find', stars: 3, score: 10, total: 10 }, tk);
    assert.equal(r.body.buddy.justDone, true);

    // Lärarens fokus
    await call('POST', '/demo/scenario', { id: 'focus' }, tk);
    assert.equal((await call('GET', '/me', null, tk)).body.player.focus, 'p7');
    await call('POST', '/demo/scenario', { id: 'nofocus' }, tk);
    assert.equal((await call('GET', '/me', null, tk)).body.player.focus, null);

    // Klasskampen hamnar strax under 75 %, och presenten och hejaropen syns
    await call('POST', '/demo/scenario', { id: 'contest' }, tk);
    await call('POST', '/demo/scenario', { id: 'gift' }, tk);
    await call('POST', '/demo/scenario', { id: 'cheer' }, tk);
    const cls = (await call('GET', '/me/class', null, tk)).body;
    const mine = cls.contest.classes.find(x => x.mine);
    assert.ok(mine.percent >= 70 && mine.percent < 75, `berget är på ${mine.percent} %`);
    assert.equal(cls.gifts.length, 1);
    assert.equal(cls.myCheers, 2);

    // Två testare ser inte varandra
    const other = (await call('POST', '/demo/start', {})).body;
    assert.notEqual(other.player.classCode, s.player.classCode);
    assert.equal((await call('POST', '/demo/scenario', { id: 'nope' }, tk)).status, 400);
    assert.equal((await call('POST', '/demo/scenario', { id: 'invite' }, 'fel')).status, 401);
  } finally {
    server.close();
    await demo.close();
  }
});
