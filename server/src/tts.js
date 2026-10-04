// Talsyntes på servern med Piper (https://github.com/rhasspy/piper) och en
// svensk röst. Telefonernas inbyggda talsyntes är opålitlig, särskilt på
// iPhone, så spelet hämtar i stället färdiga ljudfiler härifrån och spelar dem
// som vanligt ljud. Saknas Piper faller spelet tillbaka på telefonens röst.
//
// Piper körs som en enda process som hela tiden är igång: en JSON-rad in med
// texten och filnamnet, filnamnet ut när ljudet är klart. Färdiga ljud sparas i
// en cache, så varje mening räknas bara fram en gång.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const TTS_MAX = 160;
// Bara bokstäver, siffror och vanlig interpunktion. Räknetecken skrivs ut i ord.
export function speechText(raw) {
  return String(raw ?? '')
    .replaceAll('−', ' minus ').replace(/(\d)\s*-\s*(\d)/g, '$1 minus $2')
    .replaceAll('+', ' plus ').replaceAll('=', ' är ')
    .replace(/[^\p{L}\p{N}\s!?,.'-]/gu, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, TTS_MAX);
}

export function createTts({ bin, model, cacheDir = path.join(os.tmpdir(), 'talkamrater-tts'), maxCacheFiles = 5000, log = console } = {}) {
  if (!bin || !model || !fs.existsSync(bin) || !fs.existsSync(model)) return null;
  fs.mkdirSync(cacheDir, { recursive: true });
  let proc = null, lines = null;
  const queue = [];      // jobb som väntar: { text, file, resolve, reject }
  let current = null;    // jobbet Piper arbetar med just nu
  const pending = new Map(); // samma mening som efterfrågas flera gånger samtidigt

  function start() {
    proc = spawn(bin, ['--model', model, '--json-input', '--output_dir', cacheDir, '--sentence_silence', '0.1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    lines = createInterface({ input: proc.stdout });
    lines.on('line', line => {
      if (!current) return;
      const job = current; current = null;
      if (path.resolve(line.trim()) === path.resolve(job.tmp)) {
        fs.rename(job.tmp, job.file, err => (err ? job.reject(err) : job.resolve(job.file)));
      } else job.reject(new Error('Oväntat svar från Piper'));
      next();
    });
    proc.stderr.on('data', () => {}); // Piper loggar till stderr; tyst
    proc.on('error', err => log.error('Piper kunde inte starta:', err.message));
    proc.on('exit', code => {
      proc = null;
      if (current) { current.reject(new Error(`Piper avslutades (${code})`)); current = null; }
      // Starta om vid nästa jobb
      if (queue.length) setTimeout(next, 1000);
    });
  }
  function next() {
    if (current || !queue.length) return;
    if (!proc) start();
    current = queue.shift();
    proc.stdin.write(JSON.stringify({ text: current.text, output_file: current.tmp }) + '\n');
  }

  let written = 0;
  function prune() {
    // Håll cachen lagom stor: ta bort de äldsta filerna
    try {
      const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.wav'))
        .map(f => ({ f, t: fs.statSync(path.join(cacheDir, f)).mtimeMs })).sort((a, b) => a.t - b.t);
      for (const { f } of files.slice(0, Math.max(0, files.length - maxCacheFiles))) fs.unlinkSync(path.join(cacheDir, f));
    } catch { /* ignoreras */ }
  }

  // Ger sökvägen till en WAV-fil för texten
  function synth(raw) {
    const text = speechText(raw);
    if (!text) return Promise.reject(new Error('Ingen text'));
    const key = crypto.createHash('sha1').update(model + '\n' + text).digest('hex');
    const file = path.join(cacheDir, key + '.wav');
    if (fs.existsSync(file)) return Promise.resolve(file);
    if (pending.has(key)) return pending.get(key);
    if (queue.length >= 50) return Promise.reject(new Error('Talsyntesen är upptagen'));
    const p = new Promise((resolve, reject) => {
      queue.push({ text, file, tmp: path.join(cacheDir, `${key}.${process.pid}.tmp.wav`), resolve, reject });
      next();
    }).finally(() => {
      pending.delete(key);
      if (++written % 200 === 0) prune();
    });
    pending.set(key, p);
    return p;
  }

  return { synth, close: () => { if (proc) proc.kill(); } };
}
