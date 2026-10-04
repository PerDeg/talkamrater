import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTts, speechText } from '../src/tts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const bin = path.join(here, 'fixtures/fake-piper.mjs');
const model = path.join(here, 'fixtures/fake-voice.onnx');

test('speechText skriver ut räknetecken och tar bort emojis', () => {
  assert.equal(speechText('8 − 3 = 5 🎉'), '8 minus 3 är 5');
  assert.equal(speechText('3 + 5 = 8!'), '3 plus 5 är 8!');
  assert.equal(speechText('<script>Hej</script>'), 'script Hej script');
  assert.equal(speechText('x'.repeat(500)).length, 160);
});

test('saknas Piper blir talsyntesen avstängd', () => {
  assert.equal(createTts({ bin: '/finns/inte', model }), null);
});

test('Piper-processen återanvänds, cachar och klarar en krasch', async () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
  const tts = createTts({ bin, model, cacheDir });
  try {
    const [a, b, c] = await Promise.all([tts.synth('Hurra!'), tts.synth('Hurra!'), tts.synth('Bra jobbat Edwin!')]);
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.ok(fs.statSync(a).size > 44);
    const again = await tts.synth('Hurra!');
    assert.equal(again, a);
    await assert.rejects(tts.synth('krascha'));
    // Startar om efter kraschen
    assert.ok(fs.existsSync(await tts.synth('Nu igen')));
    await assert.rejects(tts.synth('🎉'));
  } finally { tts.close(); }
});

test('GET /api/tts ger en WAV-fil som får cachas', async () => {
  const { createApp } = await import('../src/app.js');
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
  const tts = createTts({ bin, model, cacheDir });
  const app = createApp({ db: null, t: {}, client: 'none', tts });
  const server = await new Promise(res => { const s = app.listen(0, () => res(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const r = await fetch(`${base}/tts?t=${encodeURIComponent('Hej Edwin!')}`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'audio/wav');
    assert.match(r.headers.get('cache-control'), /immutable/);
    assert.equal((await r.arrayBuffer()).byteLength, 44 + 1600);
    assert.equal((await fetch(`${base}/tts?t=`)).status, 503);
    const off = createApp({ db: null, t: {}, client: 'none' });
    const s2 = await new Promise(res => { const s = off.listen(0, () => res(s)); });
    assert.equal((await fetch(`http://127.0.0.1:${s2.address().port}/api/tts?t=hej`)).status, 404);
    s2.close();
  } finally { server.close(); tts.close(); }
});

test('flera röster: var sin process, egen cache, okänd röst ger standardrösten', async () => {
  const { findVoices } = await import('../src/tts.js');
  const voices = findVoices(path.join(here, 'fixtures/voices'));
  assert.deepEqual(Object.keys(voices).sort(), ['lisa', 'nst']);
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
  const tts = createTts({ bin, voices, defaultVoice: 'lisa', cacheDir });
  try {
    assert.equal(tts.defaultVoice, 'lisa');
    const [a, b, c] = await Promise.all([tts.synth('Hej!', 'lisa'), tts.synth('Hej!', 'nst'), tts.synth('Hej!', 'hackare')]);
    assert.notEqual(a, b);
    assert.equal(a, c);
  } finally { tts.close(); }
});
