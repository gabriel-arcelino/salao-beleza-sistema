#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let anyFailed = false;

// 1. Roda pgTAP (adaptador existente)
const pgTap = spawnSync('node', [path.join(__dirname, 'onp-pgtap-verify.cjs')], { encoding: 'utf-8', stdio: 'inherit' });
if (pgTap.status !== 0) anyFailed = true;

// 2. Roda vitest (frontend) e captura TAP para mapear @spec: tags
const vitest = spawnSync('node', [path.join(__dirname, '..', 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=tap', '--config=vitest.config.ts'], {
  encoding: 'utf-8',
  stdio: 'pipe',
  maxBuffer: 64 * 1024 * 1024,
});

if (vitest.stdout) {
  process.stdout.write(vitest.stdout);
}

if (vitest.status !== 0) anyFailed = true;

process.exit(anyFailed ? 1 : 0);
