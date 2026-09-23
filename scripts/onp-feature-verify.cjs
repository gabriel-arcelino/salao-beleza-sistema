#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.argv.length !== 3) {
  console.error('uso: node scripts/onp-feature-verify.cjs <feature>');
  process.exit(1);
}

const feature = process.argv[2];
const featureDir = path.join(process.cwd(), '.spec', 'features', feature);

if (!fs.existsSync(featureDir)) {
  console.error(`feature "${feature}" nao encontrada em .spec/features/${feature}/`);
  process.exit(1);
}

const onpScript = path.join(
  process.cwd(),
  '.claude', 'skills', 'onp-spec-driven', 'scripts', 'onp-spec.mjs'
);

function featureHasPgTap(featureName) {
  const specPath = path.join(process.cwd(), '.spec', 'features', featureName, 'spec.md');
  if (!fs.existsSync(specPath)) return false;
  const specContent = fs.readFileSync(specPath, 'utf8');
  const acIds = [...specContent.matchAll(/AC-\d{3,}/g)].map((m) => m[0]);
  const uniqueAcs = [...new Set(acIds)];
  if (uniqueAcs.length === 0) return false;
  const acTags = uniqueAcs.map((ac) => `@spec:${ac}`);
  const testDir = path.join(process.cwd(), 'supabase', 'tests');
  if (!fs.existsSync(testDir)) return false;
  const files = fs.readdirSync(testDir).filter((f) => /^0\d{2}_.*\.sql$/.test(f));
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(testDir, f), 'utf8');
      if (acTags.some((tag) => content.includes(tag))) {
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

const env = { ...process.env, ONP_VERIFY_FEATURE: feature };

if (featureHasPgTap(feature)) {
  console.log('Feature possui testes pgTAP; preparando banco com db reset...');
  const resetProc = spawnSync('npx supabase db reset', {
    stdio: 'inherit',
    env,
    shell: true,
  });
  if ((resetProc.status !== 0 && resetProc.status !== null) || resetProc.signal !== null) {
    console.error('npx supabase db reset falhou; abortando feature verify.');
    process.exit(resetProc.status || 1 || 1);
  }
}

const child = spawnSync('node', [onpScript, 'verify', feature], {
  env,
  stdio: 'inherit',
});

process.exit(child.status !== null ? child.status : 1);
