// Usage: node _build/assemble.mjs [outFile]   (default: ../index.html)
import fs from 'node:fs';
import path from 'node:path';
import { assemble, ROOT, loadSpec, PARTS } from './lib.mjs';

const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'index.html');
const html = assemble();
fs.writeFileSync(out, html);
const spec = loadSpec();
const missing = spec.objects.filter((o) => !fs.existsSync(path.join(PARTS, `${o.id}.html`))).map((o) => o.id);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(1)} KB)`);
console.log(missing.length ? `missing parts (${missing.length}): ${missing.join(', ')}` : 'all parts present');
