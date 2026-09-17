#!/usr/bin/env node
// Adapter que roda vitest (tests frontend) e combina com o mecanismo do onp-spec.
// Emite TAP para que `onp-spec verify` possa ler.

const { spawnSync } = require('child_process');

const proc = spawnSync('npx', ['vitest', 'run', '--reporter=tap', '--config=vitest.config.ts'], {
  encoding: 'utf-8',
  stdio: 'inherit',
  maxBuffer: 64 * 1024 * 1024,
});

process.exit(proc.status || 0);
