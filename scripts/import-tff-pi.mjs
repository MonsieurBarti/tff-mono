#!/usr/bin/env node
// One-shot importer for M01-S03. Deleted in T10.
// Usage: node scripts/import-tff-pi.mjs <src-abs-path> <dst-abs-path>
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const [, , srcArg, dstArg] = process.argv;
if (!srcArg || !dstArg) {
  console.error('Usage: node scripts/import-tff-pi.mjs <src-abs-path> <dst-abs-path>');
  process.exit(1);
}
const SRC = resolve(srcArg);
const DST = resolve(dstArg);

// SPEC §2.1: COPY-only entries (SKIP entries are simply omitted).
// Mirror this list in T02 step 5's manifest-equality check.
const COPY = [
  '.gitignore',
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'biome.json',
  'package.json',
  'tsconfig.json',
  'tsconfig.build.json',
  'vitest.config.ts',
  'src',
  'tests',
];

if (!existsSync(SRC)) {
  console.error(`✗ source not found: ${SRC}`);
  process.exit(1);
}
if (!existsSync(DST)) mkdirSync(DST, { recursive: true });

const before = new Set(readdirSync(DST));
if (before.size > 0 && !(before.size === 1 && before.has('.gitkeep'))) {
  console.error(`✗ destination not empty: ${DST} (contents: ${[...before].join(', ')})`);
  process.exit(1);
}

for (const entry of COPY) {
  const from = join(SRC, entry);
  if (!existsSync(from)) {
    console.error(`✗ manifest entry missing in source: ${entry}`);
    process.exit(1);
  }
  cpSync(from, join(DST, entry), { recursive: true });
  console.log(`✓ copied ${entry}`);
}

console.log(`\n✓ import complete (${COPY.length} entries copied to ${DST})`);
