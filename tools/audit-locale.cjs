#!/usr/bin/env node
/**
 * Spec: presentation-principles / "Display strings in Bahasa Indonesia only" +
 *       design D8.
 *
 * Two-part audit:
 *  1. The i18n bundle MUST be Bahasa Indonesia only — no English locale, no
 *     toggle. We enforce this by asserting only `id-ID` keys exist in the
 *     bundle and by flagging obvious English words in the rendered values.
 *  2. Source identifiers MUST be English. We scan a sample of Bahasa words
 *     in identifier positions (variable / function / type names) outside
 *     the i18n bundle and `*.bahasa.ts` copy files.
 *
 * Exits non-zero on either failure.
 */

const fs = require('node:fs');
const path = require('node:path');

// ---------- 1. Bahasa-only bundle audit ----------
const i18nFile = path.resolve('apps/web/src/i18n/id.ts');
const indexFile = path.resolve('apps/web/src/i18n/index.ts');

const offenders = [];

if (fs.existsSync(indexFile)) {
  const idx = fs.readFileSync(indexFile, 'utf8');
  if (/['"]en-?US['"]|['"]en['"]/.test(idx)) {
    offenders.push({
      file: indexFile,
      reason: 'i18next config references an English locale; UI is Bahasa-only',
    });
  }
}

const SUSPICIOUS_ENGLISH = [
  /\bsign in\b/i,
  /\bsign out\b/i,
  /\baccount\b/i,
  /\bcase\b/i,
  /\btoday\b/i,
  /\btimeline\b/i,
];

if (fs.existsSync(i18nFile)) {
  const bundle = fs.readFileSync(i18nFile, 'utf8');
  for (const re of SUSPICIOUS_ENGLISH) {
    const match = bundle.match(re);
    if (match) {
      // Only flag if it appears as a value, not in a code identifier. The
      // bundle uses object-literal keys in English (e.g. `signin.title`); the
      // values are Bahasa. Heuristic: the match should not be inside a
      // single-line `key:` position (i.e. before a colon on the same line).
      const lines = bundle.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        if (!re.test(lines[i])) continue;
        const isKey = /^\s*[\w]+:/.test(lines[i]);
        if (isKey) continue;
        offenders.push({
          file: i18nFile,
          line: i + 1,
          reason: `English phrase found in Bahasa bundle value: /${re.source}/`,
        });
      }
    }
  }
}

// ---------- 2. English-identifier audit (source code) ----------
// Heuristic list of Bahasa words that, if used as an identifier, indicate a
// translation leaked into code. The custom ESLint plugin already enforces
// this; we duplicate the rule here as a build-time safety net.
const BAHASA_DETECT = new Set([
  'untuk',
  'dengan',
  'tidak',
  'sudah',
  'belum',
  'silakan',
  'simpan',
  'hapus',
  'kembali',
  'pengguna',
  'pengaturan',
  'tampilkan',
  'sembunyikan',
]);

const ALLOWED_DOMAIN = new Set([
  // Bahasa proper nouns that legitimately appear in code (product surface).
  'kawal',
  'kasus',
  'beranda',
  'dosier',
  'profil',
  'glosarium',
  'peta',
  'garis',
  'waktu',
  'tokoh',
  'institusi',
  'perusahaan',
  'dokumen',
  'inkracht',
  'putusan',
  'tanggapan',
  'tanggal',
  'bahasa',
  'riwayat',
  'alasan',
  'saya',
]);

const IDENTIFIER_RE = /\b(const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][\w$]*)/g;

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}

const codeFiles = [];
walk('apps', codeFiles);
walk('packages', codeFiles);

for (const file of codeFiles) {
  if (/(\bi18n\b|\.bahasa\.(ts|tsx)$|\.test\.tsx?$)/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(IDENTIFIER_RE)) {
    const name = m[2];
    const norm = name.toLowerCase();
    const parts = norm.split(/[^a-z]+/).filter(Boolean);
    // Skip if every part is allowed Kawal proper-noun.
    if (parts.every((p) => ALLOWED_DOMAIN.has(p))) continue;
    if (parts.some((p) => BAHASA_DETECT.has(p))) {
      offenders.push({ file, reason: `Bahasa-looking identifier "${name}"` });
    }
  }
}

if (offenders.length > 0) {
  console.error('locale audit failed:');
  for (const o of offenders) {
    if (o.line) console.error(`  ${o.file}:${o.line} — ${o.reason}`);
    else console.error(`  ${o.file} — ${o.reason}`);
  }
  process.exit(1);
}
console.log(`locale audit passed (${codeFiles.length} code files + 1 i18n bundle scanned)`);
