// Static checks that keep every object isolated inside the single HTML file.
// Usage: node _build/lint.mjs [ID ...]      (default: every part that exists)
import fs from 'node:fs';
import path from 'node:path';
import { PARTS, loadSpec } from './lib.mjs';

const spec = loadSpec();
const byId = Object.fromEntries(spec.objects.map((o) => [o.id, o]));
const iconIds = new Set();
for (const f of fs.existsSync(PARTS) ? fs.readdirSync(PARTS) : []) {
  if (/^_icons.*\.html$/.test(f)) for (const m of fs.readFileSync(path.join(PARTS, f), 'utf8').matchAll(/<symbol[^>]*\sid="([^"]+)"/g)) iconIds.add(m[1]);
}
let ids = process.argv.slice(2);
if (!ids.length) ids = spec.objects.map((o) => o.id).filter((id) => fs.existsSync(path.join(PARTS, `${id}.html`)));

const unescapeAttr = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function splitTop(s, sep = ',') {
  const out = []; let depth = 0, cur = '', q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

function checkCss(css, id, slug, errs, warns) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  const skipBlock = () => { let d = 1; while (i < css.length && d > 0) { if (css[i] === '{') d++; else if (css[i] === '}') d--; i++; } };
  const idRe = new RegExp(`#${id.replace('-', '\\-')}(?![\\w-])`);
  const parse = (nested) => {
    let prelude = '';
    while (i < css.length) {
      const ch = css[i];
      if (ch === '{') {
        i++;
        const p = prelude.trim(); prelude = '';
        if (p.startsWith('@')) {
          const name = p.split(/[\s(]/)[0].toLowerCase();
          if (name === '@keyframes' || name === '@-webkit-keyframes') {
            const kf = p.split(/\s+/)[1] || '';
            if (!kf.startsWith(slug + '-')) errs.push(`@keyframes "${kf}" must be prefixed "${slug}-"`);
            skipBlock();
          } else if (['@media', '@supports', '@container', '@layer'].includes(name)) parse(true);
          else if (name === '@property') {
            const pn = p.split(/\s+/)[1] || '';
            if (!pn.startsWith(`--${slug}-`)) errs.push(`@property "${pn}" must be prefixed "--${slug}-"`);
            skipBlock();
          } else { errs.push(`disallowed at-rule ${name}`); skipBlock(); }
        } else {
          for (const sel of splitTop(p)) {
            if (!idRe.test(sel)) errs.push(`selector not scoped to #${id}: "${sel.slice(0, 80)}"`);
            else if (!sel.startsWith(`#${id}`)) warns.push(`selector does not start with #${id}: "${sel.slice(0, 80)}"`);
          }
          skipBlock();
        }
      } else if (ch === '}') { i++; if (nested) return; }
      else if (ch === ';') { const p = prelude.trim(); if (p.startsWith('@')) errs.push(`disallowed statement ${p.slice(0, 40)}`); prelude = ''; i++; }
      else { prelude += ch; i++; }
    }
  };
  parse(false);
  if (/position\s*:\s*fixed/.test(css)) errs.push('position: fixed is not allowed (overlays must stay inside the stage)');
  if (/url\(\s*['"]?https?:/.test(css)) errs.push('external url() in CSS');
}

let failed = 0;
for (const id of ids) {
  const o = byId[id];
  const f = path.join(PARTS, `${id}.html`);
  const errs = [], warns = [];
  if (!o) { console.log(`✗ ${id}: not in objects.json`); failed++; continue; }
  if (!fs.existsSync(f)) { console.log(`✗ ${id}: part file missing`); failed++; continue; }
  const src = fs.readFileSync(f, 'utf8');
  const slug = id.toLowerCase().replace('-', '');

  const arts = [...src.matchAll(/<article\b([^>]*)>/g)];
  if (arts.length !== 1) errs.push(`expected exactly 1 <article>, found ${arts.length}`);
  const attrs = {};
  if (arts[0]) for (const m of arts[0][1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = unescapeAttr(m[2]);
  if (attrs.id !== id) errs.push(`article id must be "${id}"`);
  if (!/\bobj\b/.test(attrs.class || '')) errs.push('article must have class "obj"');
  const want = { 'data-name': o.name, 'data-ja': o.ja, 'data-vector': o.vector.join(' '), 'data-size': o.size, 'data-desc': o.desc };
  for (const [k, v] of Object.entries(want)) if (attrs[k] !== v) warns.push(`${k} differs from objects.json (have "${attrs[k]}", want "${v}")`);
  if (!/class="obj-stage"[^>]*data-bg="(plain|grouped|wallpaper|dark)"|data-bg="(plain|grouped|wallpaper|dark)"[^>]*class="obj-stage"/.test(src)) errs.push('missing <div class="obj-stage" data-bg="…">');

  const styles = [...src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  styles.forEach((css) => checkCss(css, id, slug, errs, warns));
  if (/style="[^"]*position\s*:\s*fixed/.test(src)) errs.push('inline position: fixed');

  const html = src.replace(/<style\b[\s\S]*?<\/style>/g, '').replace(/<script\b[\s\S]*?<\/script>/g, '');
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) if (m[1] !== id && !m[1].startsWith(`${id}-`)) errs.push(`element id "${m[1]}" must start with "${id}-"`);
  for (const m of html.matchAll(/\b(?:src|href|xlink:href)="(https?:[^"]+)"/g)) errs.push(`external resource ${m[1]}`);
  for (const m of src.matchAll(/href="#(i-[\w-]+)"/g)) if (iconIds.size && !iconIds.has(m[1])) warns.push(`icon #${m[1]} not in sprite (draw inline or use an existing one)`);
  for (const m of src.matchAll(/['"`]#(i-[\w-]+)['"`]/g)) if (iconIds.size && !iconIds.has(m[1])) warns.push(`icon #${m[1]} (in script) not in sprite`);

  const scripts = [...src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1].replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '').trim());
  scripts.forEach((js) => {
    if (js && !/^(\(\s*(\(\s*\)|function\b|async\b)|\{|;?\s*\(\(\)\s*=>)/.test(js)) errs.push('script must be wrapped in an IIFE: (() => { … })();');
    if (/\bposition\s*=\s*['"]fixed/.test(js) || /position:\s*fixed/.test(js)) errs.push('script sets position: fixed');
    if (/document\.(body|documentElement)\.(classList|style)/.test(js)) errs.push('script touches document body/html — keep changes inside the object');
    if (/https?:\/\//.test(js.replace(/http:\/\/www\.w3\.org\/[\w/]+/g, ''))) warns.push('script contains an http(s) URL');
  });

  const ok = errs.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${id}${warns.length ? `  (${warns.length} warning${warns.length > 1 ? 's' : ''})` : ''}`);
  for (const e of errs) console.log(`    error: ${e}`);
  for (const w of [...new Set(warns)]) console.log(`    warn:  ${w}`);
}
process.exitCode = failed ? 1 : 0;
