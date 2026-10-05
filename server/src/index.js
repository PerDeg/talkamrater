import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { createApp } from './app.js';
import { createTts, findVoices } from './tts.js';
import { createDemo } from './demo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;

const { db, t, client } = await openDatabase(env);
// Talsyntes med Piper om den finns (installeras i Docker-avbildningen).
// Rösterna ligger som <namn>.onnx i PIPER_VOICES, t.ex. lisa.onnx och nst.onnx.
const tts = env.TTS === 'off' ? null : createTts({
  bin: env.PIPER_BIN || '/opt/piper/piper',
  voices: findVoices(env.PIPER_VOICES || '/opt/piper/voices'),
  model: env.PIPER_MODEL || undefined,
  defaultVoice: env.TTS_VOICE || 'lisa',
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

// Testläget på /test/ med en egen databas i minnet. Stängs av med DEMO=off.
const demo = env.DEMO === 'off' ? null : await createDemo({ publicDir: env.PUBLIC_DIR || path.resolve(here, '../../public'), tts });
if (demo) {
  // Utan snedstreck skulle sidan hämta det riktiga spelets filer, så skicka vidare till /test/
  app.use('/test', (req, res, next) => (req.originalUrl.split('?')[0] === '/test' ? res.redirect(301, '/test/') : next()));
  app.use('/test', demo.router);
}

const port = Number(env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`Talkamrater lyssnar på port ${port} (databas: ${client}, talsyntes: ${tts ? `Piper (${tts.voices.join(', ')})` : 'av'})`);
  if (!env.ADMIN_KEY) console.log('OBS: ADMIN_KEY är inte satt, så adminsidan är avstängd.');
});

const stop = () => { if (tts) tts.close(); server.close(() => Promise.all([db.destroy(), demo && demo.close()]).then(() => process.exit(0))); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
