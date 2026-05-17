import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Spec: user-management / "Every user has equal authority, scoped to their
 * own dossier", / "No admin endpoint exists".
 *
 * Audit (static): no route file may register a path that resembles an
 * admin or cross-user surface. If a future contributor adds `/admin`,
 * `/users` (cross-user list), `/impersonate`, or "act as" semantics, this
 * test fails before the change ships.
 */
const FORBIDDEN_PATTERNS: ReadonlyArray<{ pattern: RegExp; rationale: string }> = [
  { pattern: /['"`]\/admin\b/i, rationale: 'no /admin surface' },
  { pattern: /['"`]\/users(\b|\/)/i, rationale: 'no cross-user /users route' },
  { pattern: /['"`]\/impersonate\b/i, rationale: 'no impersonation route' },
  { pattern: /act[\s_-]?as[\s_-]?user/i, rationale: 'no "act as user" semantics' },
  { pattern: /requireOperator\b/, rationale: 'no operator role exists' },
  { pattern: /requireAdmin\b/, rationale: 'no admin role exists' },
  { pattern: /requireRole\b/, rationale: 'no role gating exists beyond authentication' },
];

// The audit runs across the API source tree but skips its own test file.
const ROOT = resolve(__dirname, '..');

function walk(dir: string, files: string[]) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
}

describe('No admin / cross-user route surface (12.7)', () => {
  it('every API source file is free of admin-style surfaces', () => {
    const files: string[] = [];
    walk(ROOT, files);
    const offenders: Array<{ file: string; line: number; rationale: string }> = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        for (const { pattern, rationale } of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            offenders.push({ file, line: i + 1, rationale });
          }
        }
      }
    }
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});
