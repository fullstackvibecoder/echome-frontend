#!/usr/bin/env node
/**
 * Opens a headed browser. Log in manually, then press Enter in the terminal.
 * Saves session state to auth.json for the crawler to reuse.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, 'routes.json');

if (!existsSync(CONFIG_PATH)) {
  console.error('Missing routes.json. Copy routes.example.json to routes.json and fill it in.');
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const startUrl = config.loginUrl || config.baseUrl;

console.log(`Opening ${startUrl}`);
console.log('Log in in the browser window, then press Enter here to save the session.');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(startUrl);

process.stdin.resume();
await new Promise(r => process.stdin.once('data', r));

const authPath = resolve(__dirname, 'auth.json');
await context.storageState({ path: authPath });
console.log(`Saved ${authPath}`);
await browser.close();
process.exit(0);
