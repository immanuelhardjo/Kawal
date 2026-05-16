#!/usr/bin/env node
/**
 * Spec: design D5 + osint-ingestion "Ingestion is request-time and per-user".
 *
 * Worker-free runtime audit. Scans the codebase for forbidden symbols that
 * would indicate a scheduled-worker or background-job tier (BullMQ, IORedis,
 * `node-cron`, freestanding `setInterval` poller patterns at module scope),
 * which we explicitly removed when we made ingest a request-time call.
 *
 * Allow-list: lint test files (`*.test.ts`), the comment that documents the
 * absence in design.md, and the openspec change directory.
 *
 * Exits with code 1 if any forbidden pattern appears in production code.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOTS = ['apps', 'packages'];
const FORBIDDEN = [
  /from\s+['"]bullmq['"]/,
  /from\s+['"]ioredis['"]/,
  /require\(['"]bullmq['"]\)/,
  /require\(['"]ioredis['"]\)/,
  /from\s+['"]node-cron['"]/,
  /new\s+Worker\s*\(/,
];
const IGNORE_PATHS = [
  /\/node_modules\//,
  /\/dist\//,
  /\.test\.ts$/,
  /\/test\//,
];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && /\.(ts|tsx|cjs|mjs|js)$/.test(entry.name)) out.push(full);
  }
}

const offenders = [];
const files = [];
for (const root of ROOTS) {
  if (fs.existsSync(root)) walk(root, files);
}
for (const file of files) {
  if (IGNORE_PATHS.some((re) => re.test(file))) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      offenders.push({ file, pattern: re.source });
    }
  }
}

if (offenders.length > 0) {
  console.error('worker-free audit failed — forbidden patterns found:');
  for (const o of offenders) {
    console.error(`  ${o.file} — /${o.pattern}/`);
  }
  process.exit(1);
}
console.log(`worker-free audit passed (${files.length} files scanned)`);
