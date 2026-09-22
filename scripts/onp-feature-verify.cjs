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

const env = { ...process.env, ONP_VERIFY_FEATURE: feature };

const child = spawnSync('node', [onpScript, 'verify', feature], {
  env,
  stdio: 'inherit',
});

process.exit(child.status !== null ? child.status : 1);
