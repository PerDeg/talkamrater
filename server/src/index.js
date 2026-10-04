import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { createTts } from './tts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;

const { db, t, client } = await openDatabase(env);
// Talsyntes med Piper om den finns (installeras i Docker-avbildningen)
const tts = env.TTS === 'off' ? null : createTts({
  bin: env.PIPER_BIN || '/opt/piper/piper',
  model: env.PIPER_MODEL || '/opt/piper/voice.onnx',
  cacheDir: env.TTS_CACHE || undefined
});
const app = createApp({
  db, t, client, tts,
  adminKey: env.ADMIN_KEY || '',
  publicDir: env.PUBLIC_DIR || path.resolve(here, '../../public'),
  trustProxy: env.TRUST_PROXY || 'loopback, linklocal, uniquelocal',
  // Sajter som får visa klasswidgeten, t.ex. https://klass2.degerfalt.se
  // Spelets publika adress, används i länkar från widgeten (t.ex. https://talkamrater.degerfalt.se/)
  publicUrl: env.PUBLIC_URL || '',
  allowedOrigins: (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean)
});

const port = Number(env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`Talkamrater lyssnar på port ${port} (databas: ${client}, talsyntes: ${tts ? 'Piper' : 'av'})`);
  if (!env.ADMIN_KEY) console.log('OBS: ADMIN_KEY är inte satt, så adminsidan är avstängd.');
});

const stop = () => { if (tts) tts.close(); server.close(() => db.destroy().then(() => process.exit(0))); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
