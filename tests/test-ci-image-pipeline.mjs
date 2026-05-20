/**
 * CI Image Pipeline Test — no Playwright required
 * Tests: fetch real El Cabong images → upload to Supabase Storage
 * Simulates exactly what image-uploader.ts does for each event
 * Run: node test-ci-image-pipeline.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env (local only — CI uses env vars directly)
const env = {};
try {
  readFileSync(resolve('.env'), 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k?.trim() && v.length) env[k.trim()] = v.join('=').trim();
  });
} catch {}

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || env.SUPABASE_SERVICE_ROLE_KEY
  || env.SUPABASE_SERVICE_KEY
  || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const RUN_ID = Date.now();
const BUCKET = 'event-images';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://elcabong.com.br/',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
};

// Real El Cabong image URLs (from previous test run)
const IMAGE_URLS = [
  'https://elcabong.com.br/wp-content/uploads/2024/12/Leandro-Tigrao-2.jpg',
  'https://elcabong.com.br/wp-content/uploads/2025/01/oz-favoritos.jpg',
  'https://elcabong.com.br/wp-content/uploads/2026/01/encontro-de-sambistas.jpg',
  'https://elcabong.com.br/wp-content/uploads/2025/10/vagner-santana.jpg',
  'https://elcabong.com.br/wp-content/uploads/2026/04/Noite-de-Forro-Alavantuzz-convida-Diana.jpeg',
];

// Repeat to simulate 167 events (cycling through available images)
const SIMULATED_EVENTS = Array.from({ length: 167 }, (_, i) => ({
  id: `ci-test-event-${RUN_ID}-${i}`,
  imageUrl: IMAGE_URLS[i % IMAGE_URLS.length],
}));

console.log(`\n══ CI Image Pipeline Test ══`);
console.log(`Environment: ${process.env.CI ? 'GitHub Actions' : 'Local'}`);
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Simulating ${SIMULATED_EVENTS.length} events with ${IMAGE_URLS.length} unique images\n`);

const stats = { ok: 0, downloadFail: 0, uploadFail: 0 };
const failures = [];
const globalStart = Date.now();

for (const { id, imageUrl } of SIMULATED_EVENTS) {
  const i = SIMULATED_EVENTS.indexOf(SIMULATED_EVENTS.find(e => e.id === id));
  const elapsedTotal = Date.now() - globalStart;

  // ── Step A: Download image ──────────────────────────────────
  let buffer = null;
  let contentType = 'image/jpeg';
  const dlStart = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(imageUrl, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      buffer = Buffer.from(await res.arrayBuffer());
      contentType = res.headers.get('content-type') || 'image/jpeg';
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    const dlMs = Date.now() - dlStart;
    stats.downloadFail++;
    failures.push({ step: 'download', i, elapsedTotal, dlMs, msg: err.message });
    console.log(`  #${String(i).padStart(3)} [${elapsedTotal}ms] ❌ DOWNLOAD (${dlMs}ms): ${err.name}: ${err.message}`);
    continue;
  }

  // ── Step B: Upload to Supabase ──────────────────────────────
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `events/${id}.${ext}`;
  const upStart = Date.now();
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    const upMs = Date.now() - upStart;

    if (error) {
      stats.uploadFail++;
      failures.push({ step: 'upload', i, elapsedTotal, upMs, msg: error.message });
      console.log(`  #${String(i).padStart(3)} [${elapsedTotal}ms] ❌ UPLOAD (${upMs}ms): ${error.message}`);
    } else {
      stats.ok++;
      if (i % 25 === 0 || i === SIMULATED_EVENTS.length - 1) {
        console.log(`  #${String(i).padStart(3)} [${elapsedTotal}ms] ✅ dl:${Date.now()-dlStart-(upMs)}ms up:${upMs}ms`);
      }
    }
  } catch (err) {
    const upMs = Date.now() - upStart;
    stats.uploadFail++;
    failures.push({ step: 'upload', i, elapsedTotal, upMs, msg: `${err.name}: ${err.message}` });
    console.log(`  #${String(i).padStart(3)} [${elapsedTotal}ms] ❌ UPLOAD THREW (${upMs}ms): ${err.name}: ${err.message}`);
  }
}

const totalMs = Date.now() - globalStart;

console.log(`\n══ Results ══`);
console.log(`  ✅ Success:        ${stats.ok}`);
console.log(`  ❌ Download fails: ${stats.downloadFail}`);
console.log(`  ❌ Upload fails:   ${stats.uploadFail}`);
console.log(`  Total time:        ${totalMs}ms (${(totalMs/1000).toFixed(1)}s)`);
console.log(`  Avg per event:     ${(totalMs/SIMULATED_EVENTS.length).toFixed(0)}ms`);

if (failures.length > 0) {
  console.log(`\n══ Failure pattern ══`);
  console.log(`  First failure: #${failures[0].i} at ${failures[0].elapsedTotal}ms into run`);
  console.log(`  Last failure:  #${failures[failures.length-1].i} at ${failures[failures.length-1].elapsedTotal}ms`);
  const uniqueMsgs = [...new Set(failures.map(f => `[${f.step}] ${f.msg}`))];
  console.log(`  Unique errors: ${uniqueMsgs.join(' | ')}`);
}

// Cleanup
console.log(`\n══ Cleanup ══`);
const paths = SIMULATED_EVENTS.map(e => `events/${e.id}.jpg`);
for (let i = 0; i < paths.length; i += 50) {
  await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 50));
}
console.log(`  🧹 Test files removed`);

console.log('\n✅ Done.');

// Exit with error if too many failures (useful for CI pass/fail)
if (stats.uploadFail + stats.downloadFail > 5) {
  console.error(`\n❌ Too many failures (${stats.uploadFail + stats.downloadFail}) — pipeline unreliable in this environment`);
  process.exit(1);
}
