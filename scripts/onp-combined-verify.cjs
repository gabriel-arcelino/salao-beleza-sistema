#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const featureName = process.env.ONP_VERIFY_FEATURE || null;

function getFeatureAcs(featureName) {
  const specPath = path.join(process.cwd(), '.spec', 'features', featureName, 'spec.md');
  if (!fs.existsSync(specPath)) return [];
  const content = fs.readFileSync(specPath, 'utf8');
  const ids = [...content.matchAll(/AC-\d{3,}/g)].map((m) => m[0]);
  return [...new Set(ids)];
}

function findVitestFilesForAcs(acs) {
  const acTags = acs.map((ac) => `@spec:${ac}`);
  const candidates = [];
  const dirs = ['tests', 'test', '__tests__', 'src'];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    function scanDir(p) {
      try {
        for (const e of fs.readdirSync(p, { withFileTypes: true })) {
          const fp = path.join(p, e.name);
          const rel = path.relative(process.cwd(), fp);
          if (e.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', 'coverage', '.spec', 'supabase', 'scripts', 'public'].includes(e.name)) {
              scanDir(fp);
            }
          } else if (e.isFile() && (e.name.endsWith('.spec.ts') || e.name.endsWith('.spec.tsx') || e.name.endsWith('.spec.js') || e.name.endsWith('.spec.jsx') || e.name.endsWith('.test.ts') || e.name.endsWith('.test.tsx') || e.name.endsWith('.test.js') || e.name.endsWith('.test.jsx'))) {
            candidates.push(rel);
          }
        }
      } catch {
        // ignore
      }
    }
    scanDir(d);
  }
  const result = [];
  for (const fp of candidates) {
    try {
      const content = fs.readFileSync(fp, 'utf8');
      if (acTags.some((tag) => content.includes(tag))) {
        result.push(fp);
      }
    } catch {
      // ignore
    }
  }
  return [...new Set(result)];
}

let anyFailed = false;

if (!featureName) {
  // Global mode: keep existing behavior exactly
  const pgTap = spawnSync('node', [path.join(__dirname, 'onp-pgtap-verify.cjs')], { encoding: 'utf-8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024, env: process.env });
  if (pgTap.status !== 0) anyFailed = true;
  if (pgTap.stdout) process.stdout.write(pgTap.stdout);

  const vitest = spawnSync('node', [path.join(__dirname, '..', 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=tap', '--config=vitest.config.ts'], {
    encoding: 'utf-8',
    stdio: 'pipe',
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });

  if (vitest.stdout) {
    process.stdout.write(vitest.stdout);
  }

  if (vitest.status !== 0) anyFailed = true;

  process.exit(anyFailed ? 1 : 0);
  return;
}

const acs = getFeatureAcs(featureName);
if (acs.length === 0) {
  console.error(`nenhum AC encontrado para feature "${featureName}" em .spec/features/${featureName}/spec.md`);
  process.exit(1);
}

// Feature mode: filter pgTAP
const pgTapEnv = { ...process.env, ONP_VERIFY_FEATURE: featureName };
const pgTap = spawnSync('node', [path.join(__dirname, 'onp-pgtap-verify.cjs')], {
  encoding: 'utf-8',
  stdio: 'pipe',
  maxBuffer: 64 * 1024 * 1024,
  env: pgTapEnv,
});
if (pgTap.status !== 0) anyFailed = true;
if (pgTap.stdout) process.stdout.write(pgTap.stdout);

// Feature mode: filter Vitest
const vitestFiles = findVitestFilesForAcs(acs);
if (vitestFiles.length > 0) {
  const tagsPattern = acs.map((ac) => `@spec:${ac}`).join('|');
  const args = [
    'run',
    '--reporter=tap',
    '--config=vitest.config.ts',
    '--testNamePattern', tagsPattern,
    ...vitestFiles,
  ];

  const vitestEnv = { ...process.env, ONP_VERIFY_FEATURE: featureName };
  const vitest = spawnSync('node', [path.join(__dirname, '..', 'node_modules', 'vitest', 'vitest.mjs'), ...args], {
    encoding: 'utf-8',
    stdio: 'pipe',
    maxBuffer: 64 * 1024 * 1024,
    env: vitestEnv,
  });

  if (vitest.stdout) {
    process.stdout.write(vitest.stdout);
  }
  if (vitest.status !== 0) anyFailed = true;
}

process.exit(anyFailed ? 1 : 0);

