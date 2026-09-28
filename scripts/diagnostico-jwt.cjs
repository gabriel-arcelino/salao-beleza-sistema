#!/usr/bin/env node

const { URL } = require("node:url");

function requiredEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function decodeClaims(token) {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("JWT sem payload");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function toIso(seconds) {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

function publicClaims(claims) {
  return {
    issued_at: toIso(claims.iat),
    not_before: toIso(claims.nbf),
    expires_at: toIso(claims.exp),
    issuer: claims.iss || null,
    audience: claims.aud || null,
  };
}

function publicResponse(response, body, durationMs) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }

  return {
    status: response.status,
    duration_ms: durationMs,
    content_type: response.headers.get("content-type"),
    error_code: parsed?.code || null,
    error_message: typeof parsed?.message === "string" ? parsed.message : null,
  };
}

async function requestJson(url, options) {
  const startedAt = Date.now();
  const response = await fetch(url, options);
  const body = await response.text();
  return publicResponse(response, body, Date.now() - startedAt);
}

async function run() {
  const baseUrl = requiredEnv("SUPABASE_URL", process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321").replace(/\/$/, "");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY", process.env.VITE_SUPABASE_ANON_KEY);
  const email = requiredEnv("DIAGNOSTICO_JWT_EMAIL");
  const password = requiredEnv("DIAGNOSTICO_JWT_PASSWORD");
  const competencia = process.env.DIAGNOSTICO_JWT_COMPETENCIA || new Date().toISOString().slice(0, 7);
  const observedAt = new Date().toISOString();

  const authResponse = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const authBody = await authResponse.json();
  if (!authResponse.ok || !authBody.access_token) {
    throw new Error(`Auth falhou: ${authResponse.status} ${authBody.error_description || authBody.msg || "resposta sem token"}`);
  }

  const token = authBody.access_token;
  const claims = publicClaims(decodeClaims(token));
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };

  const dashboard = await requestJson(`${baseUrl}/rest/v1/rpc/fn_dashboard_indicadores`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_competencia: competencia }),
  });
  const estoque = await requestJson(`${baseUrl}/rest/v1/produtos?select=*&estoque_atual=lt.0&order=estoque_atual.asc`, {
    method: "GET",
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });

  console.log(JSON.stringify({
    observed_at: observedAt,
    base_url: baseUrl,
    competencia,
    claims,
    requests: { dashboard, estoque },
    secrets_logged: false,
  }, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { decodeClaims, publicClaims, publicResponse };
