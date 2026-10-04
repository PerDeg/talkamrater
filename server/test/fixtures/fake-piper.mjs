#!/usr/bin/env node
// Låtsas-Piper för testerna: samma protokoll som `piper --json-input`.
// Skriver en kort tyst WAV-fil och svarar med filnamnet.
import { createInterface } from 'node:readline';
import fs from 'node:fs';
const wav = () => {
  const n = 800, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(22050, 24); b.writeUInt32LE(44100, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  return b;
};
createInterface({ input: process.stdin }).on('line', line => {
  const { text, output_file: out } = JSON.parse(line);
  if (text === 'krascha') process.exit(3);
  fs.writeFileSync(out, wav());

  setTimeout(() => process.stdout.write(out + '\n'), 20);
});
