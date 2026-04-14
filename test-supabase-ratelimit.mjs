/**
 * Test: Does Supabase Storage rate-limit rapid sequential uploads?
 * Simulates exactly what the El Cabong scraper does: 167 sequential upload calls.
 * Run: node test-supabase-ratelimit.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env
const env = {};
try {
  readFileSync(resolve('.env'), 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k?.trim() && v.length) env[k.trim()] = v.join('=').trim();
  });
} catch {}

const SUPABASE_URL = env.SUPABASE_URL || '';
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_KEY not set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create a small dummy image buffer (1x1 JPEG — minimal valid JPEG)
const DUMMY_JPEG = Buffer.from([
  0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,
  0x00,0x01,0x00,0x00,0xff,0xdb,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,
  0x07,0x07,0x07,0x09,0x09,0x08,0x0a,0x0c,0x14,0x0d,0x0c,0x0b,0x0b,0x0c,0x19,0x12,
  0x13,0x0f,0x14,0x1d,0x1a,0x1f,0x1e,0x1d,0x1a,0x1c,0x1c,0x20,0x24,0x2e,0x27,0x20,
  0x22,0x2c,0x23,0x1c,0x1c,0x28,0x37,0x29,0x2c,0x30,0x31,0x34,0x34,0x34,0x1f,0x27,
  0x39,0x3d,0x38,0x32,0x3c,0x2e,0x33,0x34,0x32,0xff,0xc0,0x00,0x0b,0x08,0x00,0x01,
  0x00,0x01,0x01,0x01,0x11,0x00,0xff,0xc4,0x00,0x1f,0x00,0x00,0x01,0x05,0x01,0x01,
  0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,
  0x05,0x06,0x07,0x08,0x09,0x0a,0x0b,0xff,0xc4,0x00,0xb5,0x10,0x00,0x02,0x01,0x03,
  0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7d,0x01,0x02,0x03,0x00,
  0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,
  0x81,0x91,0xa1,0x08,0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,0x24,0x33,0x62,0x72,
  0x82,0x09,0x0a,0x16,0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,0x29,0x2a,0x34,0x35,
  0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4a,0x53,0x54,0x55,
  0xff,0xda,0x00,0x08,0x01,0x01,0x00,0x00,0x3f,0x00,0xfb,0x02,0x8a,0x28,0x03,0xff,0xd9
]);

const BUCKET = 'event-images';
const RUN_ID = Date.now();
const TOTAL = 170; // simulates 167 El Cabong events + margin

const results = { ok: 0, fail: 0, errors: [] };

// ─── TEST 1: Sequential uploads (exactly like scraper) ──────────
console.log(`\n══ TEST 1: ${TOTAL} sequential uploads (no delay) — simulating real scraper ══\n`);
console.log('Format: #N [ms elapsed] status message\n');

const t1Start = Date.now();
for (let i = 0; i < TOTAL; i++) {
  const path = `events/ratelimit-test-${RUN_ID}-${i}.jpg`;
  const elapsed = Date.now() - t1Start;
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, DUMMY_JPEG, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      results.fail++;
      results.errors.push({ i, elapsed, msg: error.message });
      console.log(`  #${String(i).padStart(3)} [${elapsed}ms] ❌ ${error.message}`);
    } else {
      results.ok++;
      if (i % 20 === 0 || i === TOTAL - 1) {
        console.log(`  #${String(i).padStart(3)} [${elapsed}ms] ✅`);
      }
    }
  } catch (err) {
    results.fail++;
    results.errors.push({ i, elapsed, msg: err.message });
    console.log(`  #${String(i).padStart(3)} [${elapsed}ms] ❌ THREW: ${err.name}: ${err.message}`);
  }
}

const t1Total = Date.now() - t1Start;
console.log(`\nResult: ${results.ok} ✅  ${results.fail} ❌  in ${t1Total}ms`);
if (results.errors.length > 0) {
  console.log(`\nFirst failure at #${results.errors[0].i} (${results.errors[0].elapsed}ms into run)`);
  console.log(`All error messages: ${[...new Set(results.errors.map(e => e.msg))].join(' | ')}`);
}

// ─── TEST 2: Sequential list() calls (check-before-upload pattern) ──
console.log(`\n══ TEST 2: ${TOTAL} sequential list() calls (check-if-exists pattern) ══\n`);

const listResults = { ok: 0, fail: 0, errors: [] };
const t2Start = Date.now();
for (let i = 0; i < TOTAL; i++) {
  const elapsed = Date.now() - t2Start;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('events', { search: `ratelimit-test-${RUN_ID}-${i}` });

    if (error) {
      listResults.fail++;
      listResults.errors.push({ i, elapsed, msg: error.message });
      console.log(`  #${String(i).padStart(3)} [${elapsed}ms] ❌ ${error.message}`);
    } else {
      listResults.ok++;
      if (i % 20 === 0 || i === TOTAL - 1) {
        console.log(`  #${String(i).padStart(3)} [${elapsed}ms] ✅ (found ${data?.length ?? 0} files)`);
      }
    }
  } catch (err) {
    listResults.fail++;
    listResults.errors.push({ i, elapsed, msg: err.message });
    console.log(`  #${String(i).padStart(3)} [${elapsed}ms] ❌ THREW: ${err.name}: ${err.message}`);
  }
}

const t2Total = Date.now() - t2Start;
console.log(`\nResult: ${listResults.ok} ✅  ${listResults.fail} ❌  in ${t2Total}ms`);
if (listResults.errors.length > 0) {
  console.log(`First list() failure at #${listResults.errors[0].i} (${listResults.errors[0].elapsed}ms)`);
}

// ─── Cleanup ─────────────────────────────────────────────────────
console.log(`\n══ Cleanup: removing ${TOTAL} test files ══\n`);
const paths = Array.from({ length: TOTAL }, (_, i) => `events/ratelimit-test-${RUN_ID}-${i}.jpg`);
// Remove in batches of 50 (Supabase limit)
for (let i = 0; i < paths.length; i += 50) {
  const batch = paths.slice(i, i + 50);
  const { error } = await supabase.storage.from(BUCKET).remove(batch);
  if (error) console.log(`  ⚠️  Cleanup batch ${i}-${i+50} error: ${error.message}`);
  else console.log(`  🧹 Removed files ${i}–${Math.min(i+50, paths.length)-1}`);
}

console.log('\n✅ Test complete.');
