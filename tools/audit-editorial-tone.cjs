#!/usr/bin/env node
/**
 * Spec: presentation-principles / "No editorializing copy in product strings",
 *       ai-assistance / "AI never adopts the editorializing voice".
 *
 * Scans the i18n bundle (`apps/web/src/i18n/**`) and `*.bahasa.ts` copy files
 * for deny-list phrases. Complements the ESLint rule (which catches in-code
 * literals) by also catching plain JSON resource files and ensuring the
 * canonical deny-list is enforced even when ESLint is disabled.
 *
 * Exits non-zero on hit, prints offending file + phrase + line for grep-ability.
 */

const fs = require('node:fs');
const path = require('node:path');

const DENY_LIST = [
  // Bahasa Indonesia (the primary audience for this rule)
  'mengejutkan',
  'sudah diduga',
  'menghebohkan',
  'fantastis',
  'gempar',
  'sensasional',
  // English equivalents that might leak via translation or copy/paste
  'shocking',
  'as expected',
  'explosive',
  'stunning',
  'breaking news',
];

const SEARCH_ROOTS = ['apps/web/src/i18n', 'packages'];
const FILE_GLOB = /\.(ts|tsx|json)$/;
const COPY_FILE_HINT = /(\bi18n\b|\.bahasa\.(ts|tsx|json)$)/;

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && FILE_GLOB.test(entry.name)) out.push(full);
  }
}

const files = [];
for (const root of SEARCH_ROOTS) walk(root, files);

const offenders = [];
for (const file of files) {
  // Only scan files that look like user-facing copy. The ESLint rule catches
  // any other leak; this scanner is the safety net for the explicit i18n
  // path even if the lint job is bypassed.
  if (!COPY_FILE_HINT.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const lower = text.toLowerCase();
  for (const phrase of DENY_LIST) {
    if (!lower.includes(phrase)) continue;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].toLowerCase().includes(phrase)) {
        offenders.push({ file, line: i + 1, phrase });
      }
    }
  }
}

if (offenders.length > 0) {
  console.error('editorial-tone audit failed — forbidden phrases found:');
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line} — "${o.phrase}"`);
  }
  process.exit(1);
}
console.log(`editorial-tone audit passed (${files.length} files scanned)`);
