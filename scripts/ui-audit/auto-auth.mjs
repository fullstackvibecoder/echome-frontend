#!/usr/bin/env node
/**
 * Programmatic auth — signs in via Supabase REST API and constructs a
 * Playwright-compatible auth.json without needing a headed browser.
 *
 * Usage: ECHOME_EMAIL=you@example.com ECHOME_PASSWORD=xxx node auto-auth.mjs
 *        — or it will prompt via readline.
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_PATH = resolve(__dirname, 'auth.json');

const SUPABASE_URL = 'https://bbsrpkjwuujuszjqwnul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJic3Jwa2p3dXVqdXN6anF3bnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMTYzODYsImV4cCI6MjA4MTg5MjM4Nn0.vmlWOTZM-uCafgxjtAXO2WRgaZykZUrF860jg8Rr3y8';

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise(r => rl.question(question, a => { rl.close(); r(a.trim()); }));
}

const email = process.env.ECHOME_EMAIL || await prompt('EchoMe email: ');
const password = process.env.ECHOME_PASSWORD || await prompt('EchoMe password: ');

console.log(`Signing in as ${email}...`);

const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  },
  body: JSON.stringify({ email, password }),
});

if (!resp.ok) {
  const err = await resp.json().catch(() => ({}));
  console.error('Login failed:', err.error_description || err.msg || resp.status);
  process.exit(1);
}

const session = await resp.json();
console.log('Got session. Expires:', new Date(session.expires_at * 1000).toISOString());

// Build Playwright storageState format. The app stores the Supabase session
// in localStorage and reads the JWT from there on each API call.
const storageKey = `sb-bbsrpkjwuujuszjqwnul-auth-token`;
const storageValue = JSON.stringify({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at,
  expires_in: session.expires_in,
  token_type: session.token_type,
  user: session.user,
});

const authState = {
  cookies: [],
  origins: [
    {
      origin: 'https://app.tryechome.com',
      localStorage: [
        { name: storageKey, value: storageValue },
        { name: 'authToken', value: session.access_token },
      ],
    },
  ],
};

writeFileSync(AUTH_PATH, JSON.stringify(authState, null, 2));
console.log(`Saved ${AUTH_PATH}`);
