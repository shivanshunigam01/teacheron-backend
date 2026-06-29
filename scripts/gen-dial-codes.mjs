import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(
  path.resolve(__dirname, '../../website-hub/src/lib/phone-codes.ts'),
  'utf8',
);
const codes = [...src.matchAll(/code: "(\+\d+)"/g)].map((m) => m[1].slice(1));
codes.sort((a, b) => b.length - a.length);
const out = `/** Auto-synced from website-hub/src/lib/phone-codes.ts */\nexport const PHONE_DIAL_CODES = ${JSON.stringify(codes, null, 2)};\n`;
fs.writeFileSync(path.resolve(__dirname, '../src/data/phone-dial-codes.js'), out);
console.log(`Wrote ${codes.length} dial codes`);
