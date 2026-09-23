#!/usr/bin/env node
// Adapter: runs the pgTAP suite (supabase/tests/0*.sql) directly against the
// local Supabase Postgres container and emits raw TAP (ok N - title @spec:AC-xxx)
// to stdout, so `onp-spec verify` (reporter: "tap") can map each AC to a proof.
//
// `npx supabase test db` hides per-test titles behind file-level dots, so this
// adapter bypasses it and drives psql straight into supabase_db_<project>.
//
// Nota: o banco usado para Feature Verify é tratado como descartável.
// `npx supabase db reset` (chamado por `onp-feature-verify.cjs` quando a feature
// possui testes pgTAP) destrói dados locais. Não há backup automatizado.
//
// Env overrides (optional):
//   SUPABASE_PROJECT_ID  (default: salao-beleza-sistema, do supabase/config.toml)
//   PGUSER               (default: postgres)
//   PGDATABASE           (default: postgres)
//   SUPABASE_DB_CONTAINER (default: supabase_db_<project>)

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = process.cwd();
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'salao-beleza-sistema';
const CONTAINER =
  process.env.SUPABASE_DB_CONTAINER || `supabase_db_${PROJECT_ID}`;
const USER = process.env.PGUSER || 'postgres';
const DB = process.env.PGDATABASE || 'postgres';

const featureName = process.env.ONP_VERIFY_FEATURE || null;

const TEST_DIR = path.join(ROOT, 'supabase', 'tests');
let files = fs
  .readdirSync(TEST_DIR)
  .filter((f) => /^0\d{2}_.*\.sql$/.test(f))
  .sort()
  .map((f) => path.join(TEST_DIR, f));

if (featureName) {
  const specPath = path.join(ROOT, '.spec', 'features', featureName, 'spec.md');
  if (!fs.existsSync(specPath)) {
    console.error(`onp-pgtap-verify: feature "${featureName}" nao encontrada em .spec/features/${featureName}/spec.md`);
    process.exit(1);
  }
  const specContent = fs.readFileSync(specPath, 'utf8');
  const acIds = [...specContent.matchAll(/AC-\d{3,}/g)].map((m) => m[0]);
  const uniqueAcs = [...new Set(acIds)];
  const acTags = uniqueAcs.map((ac) => `@spec:${ac}`);
  if (acTags.length === 0) {
    console.error(`onp-pgtap-verify: nenhum AC encontrado para feature "${featureName}"`);
    process.exit(1);
  }
  const filtered = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      if (acTags.some((tag) => content.includes(tag))) {
        filtered.push(f);
      }
    } catch {
      // ignore read errors
    }
  }
  files = filtered;
  if (!files.length && featureName) {
    // Modo feature: nenhum arquivo SQL com tags da feature; sem falha.
    process.exit(0);
  }
}

if (!files.length) {
  console.error('onp-pgtap-verify: nenhum arquivo em supabase/tests/0*.sql');
  process.exit(1);
}

const preamble = 'CREATE EXTENSION IF NOT EXISTS pgtap;\n';

let anyFailed = false;

for (const file of files) {
  const sql = preamble + fs.readFileSync(file, 'utf8');
  const proc = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      'PGPASSWORD=postgres',
      CONTAINER,
      'psql',
      '-U',
      USER,
      '-d',
      DB,
      '-t',
      '-A',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    {
      input: sql,
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
    }
  );

  if (proc.error) {
    console.error(`onp-pgtap-verify: falha ao invocar docker: ${proc.error.message}`);
    anyFailed = true;
    continue;
  }

  let out = (proc.stdout || '') + (proc.stderr || '');
  // pgTAP emite TAP via NOTICE sob alguns clientes; normaliza removendo o
  // prefixo "NOTICE:" — é um no-op quando não houver prefixo (como acontece com psql -t -A).
  out = out
    .split(/\r?\n/)
    .map((l) => (/^NOTICE:\s+(.*)$/.test(l) ? l.replace(/^NOTICE:\s+/, '') : l))
    .join('\n');

  if (out) process.stdout.write(out + '\n');

  if (proc.status !== 0) {
    anyFailed = true;
  }
}

process.exit(anyFailed ? 1 : 0);
