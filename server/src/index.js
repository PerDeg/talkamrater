import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { createApp } from './app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;

const { db, t, client } = await openDatabase(env);
const app = createApp({
  db, t, client,
  adminKey: env.ADMIN_KEY || '',
  publicDir: env.PUBLIC_DIR || path.resolve(here, '../../public'),
  trustProxy: env.TRUST_PROXY || 'loopback, linklocal, uniquelocal'
});

const port = Number(env.PORT || 3000);
const server = app.listen(port, () => {
  console.log(`Talkamrater lyssnar på port ${port} (databas: ${client})`);
  if (!env.ADMIN_KEY) console.log('OBS: ADMIN_KEY är inte satt, så adminsidan är avstängd.');
});

const stop = () => server.close(() => db.destroy().then(() => process.exit(0)));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
