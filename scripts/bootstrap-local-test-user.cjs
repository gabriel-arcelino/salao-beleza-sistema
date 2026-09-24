#!/usr/bin/env node
// scripts/bootstrap-local-test-user.cjs
// Cria/corrige usuário de teste local com app_metadata.salon_id.
// Nenhuma credencial privilegiada é persistida no arquivo.

const { execSync } = require('child_process');
const https = require('https');
const http = require('http');

function getAdminKey() {
  // Obtém SERVICE_ROLE_KEY em memória, sem salvar no arquivo
  const output = execSync('npx supabase status -o env', { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const match = output.match(/SERVICE_ROLE_KEY="([^"]+)"/);
  if (!match) throw new Error('SERVICE_ROLE_KEY não encontrado no ambiente local');
  return match[1];
}

function makeRequest(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const client = urlStr.startsWith('https') ? https : http;
    const url = new URL(urlStr);
    const options = { hostname: url.hostname, port: url.port || (urlStr.startsWith('https') ? 443 : 80), path: url.pathname + url.search, method, headers };
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    console.log('Obtendo credencial administrativa local...');
    const adminKey = getAdminKey();
    console.log('Credencial administrativa obtida (oculta).');

    const authUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const userId = 'teste@gmail.com';
    const password = '12345678';
    const salonId = '00000000-0000-0000-0000-000000000001';

    // 1. Procurar usuário no Auth
    console.log('Procurando usuário no Auth...');
    const listResp = await makeRequest(`${authUrl}/auth/v1/admin/users?email=${encodeURIComponent(userId)}`, 'GET', { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` });
    const users = JSON.parse(listResp.body || '[]');
    const user = Array.isArray(users) ? users.find(u => u.email === userId) : (users.users ? users.users.find(u => u.email === userId) : null);

    if (user) {
      console.log(`Usuário encontrado: ${user.id}`);
      // Atualizar senha, email_confirmed, app_metadata
      const updateResp = await makeRequest(`${authUrl}/auth/v1/admin/users/${user.id}`, 'PUT', { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}`, 'Content-Type': 'application/json' }, { email_confirm: true, password: password, app_metadata: { salon_id: salonId } });
      console.log('Atualização do usuário Auth realizada:', updateResp.status);
    } else {
      console.log('Usuário não encontrado, criando...');
      const createResp = await makeRequest(`${authUrl}/auth/v1/admin/users`, 'POST', { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}`, 'Content-Type': 'application/json' }, { email: userId, password: password, email_confirm: true, app_metadata: { salon_id: salonId } });
      const createdUser = JSON.parse(createResp.body || '{}');
      console.log('Usuário Auth criado:', createdUser.id || 'sem id');
      const userIdFromCreate = createdUser.id || (createdUser.users ? createdUser.users[0]?.id : null);
      if (!userIdFromCreate) throw new Error('Não foi possível obter o UUID do usuário criado');
      console.log('UUID do usuário:', userIdFromCreate);
      // Atualizar public.usuarios
      const dbUrl = process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
      // Inserir ou corrigir public.usuarios
      const sqlPath = 'C:\\Users\\janne\\AppData\\Local\\Temp\\update_usuarios_final.sql';
      const fs = require('fs');
      const sqlContent = `DELETE FROM public.usuarios WHERE auth_user_id IS NOT NULL; INSERT INTO public.usuarios (auth_user_id, salon_id, perfil, nome) VALUES ('${userIdFromCreate}', '${salonId}', 'ADMIN', 'Teste') ON CONFLICT (auth_user_id) DO UPDATE SET salon_id = '${salonId}', perfil = 'ADMIN', nome = 'Teste';`;
      fs.writeFileSync(sqlPath, sqlContent);
      const { execSync } = require('child_process');
      const dbResetOutput = execSync('npx supabase db query --file ' + sqlPath + ' --local', { encoding: 'utf8', stdio: 'inherit' });
    }

    console.log('Bootstrap concluído com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('Erro no bootstrap:', err.message || err);
    process.exit(1);
  }
}

main();
