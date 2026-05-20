/**
 * Extensive image pipeline test: download + Supabase Storage upload
 * Isolates each step to pinpoint "This operation was aborted" failure
 * Run: node test-image-download.mjs
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually
const env = {};
try {
  readFileSync(resolve('.env'), 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k?.trim() && v.length) env[k.trim()] = v.join('=').trim();
  });
} catch {}

const SUPABASE_URL = env.SUPABASE_URL || '';
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://elcabong.com.br/',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
};

// ─── STEP 1: Collect real URLs via Playwright ───────────────────
console.log('\n══ STEP 1: Collect image URLs from El Cabong ══\n');

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ userAgent: HEADERS['User-Agent'] });
await page.goto('https://elcabong.com.br/agenda/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);

const imageUrls = await page.evaluate(() => {
  const urls = [];
  document.querySelectorAll('.wpem-event-banner-img').forEach(el => {
    let url = el.getAttribute('data-speedycache-original-src');
    if (!url) {
      const bg = el.style?.backgroundImage;
      if (bg) url = bg.replace(/url\(["']?/, '').replace(/["']?\)$/, '');
    }
    if (url?.startsWith('http')) urls.push(url);
  });
  return [...new Set(urls)].slice(0, 10);
});

console.log(`Found ${imageUrls.length} image URLs:`);
imageUrls.slice(0, 5).forEach((u, i) => console.log(`  ${i+1}. ${u.split('/').slice(-2).join('/')}`));

// ─── STEP 2: Sequential download (5s timeout — same as scraper) ─
console.log('\n══ STEP 2: Sequential downloads (5s timeout each) ══\n');

const buffers = [];
for (const url of imageUrls.slice(0, 6)) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`  ✅ ${url.split('/').pop()} — ${(buf.byteLength/1024).toFixed(1)}KB in ${Date.now()-start}ms`);
    buffers.push({ url, buf, ct: res.headers.get('content-type') || 'image/jpeg' });
  } catch (err) {
    clearTimeout(timer);
    console.log(`  ❌ ${url.split('/').pop()} — ${err.name==='AbortError' ? `ABORTED (${Date.now()-start}ms)` : err.message}`);
    buffers.push(null);
  }
}

// ─── STEP 3: Concurrent download (simulates scraper processing 221 events) ──
console.log('\n══ STEP 3: Concurrent downloads — 10 at once (5s timeout) ══\n');

const concStart = Date.now();
const concResults = await Promise.allSettled(
  [...imageUrls, ...imageUrls].slice(0, 10).map(async (url, i) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
      clearTimeout(timer);
      const buf = Buffer.from(await res.arrayBuffer());
      return { i, ok: true, kb: (buf.byteLength/1024).toFixed(1), ms: Date.now()-concStart };
    } catch (err) {
      clearTimeout(timer);
      return { i, ok: false, err: err.name==='AbortError' ? `ABORTED` : err.message };
    }
  })
);
const ok3 = concResults.filter(r => r.value?.ok).length;
const fail3 = concResults.length - ok3;
console.log(`  ${ok3} ✅  ${fail3} ❌  — total ${Date.now()-concStart}ms`);
concResults.forEach(r => {
  if (!r.value?.ok) console.log(`    #${r.value?.i}: ❌ ${r.value?.err}`);
});

// ─── STEP 4: Supabase Storage upload ───────────────────────────
console.log('\n══ STEP 4: Supabase Storage upload ══\n');

if (!supabase) {
  console.log('  ⚠️  Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env)');
} else {
  console.log(`  URL: ${SUPABASE_URL}`);

  // 4a. Check bucket exists
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log(`  ❌ listBuckets error: ${bErr.message}`);
  } else {
    const names = buckets.map(b => b.name);
    const has = names.includes('event-images');
    console.log(`  Buckets: ${names.join(', ')}`);
    console.log(`  event-images bucket: ${has ? '✅ exists' : '❌ NOT FOUND — this is the problem!'}`);
  }

  // 4b. Single upload
  const sample = buffers.find(Boolean);
  if (sample) {
    const path = `events/test-diag-${Date.now()}.jpg`;
    console.log(`\n  Single upload test → ${path}`);
    const t0 = Date.now();
    try {
      const { error } = await supabase.storage
        .from('event-images')
        .upload(path, sample.buf, { contentType: 'image/jpeg', upsert: true });
      if (error) {
        console.log(`  ❌ Upload error (${Date.now()-t0}ms): "${error.message}"`);
        console.log(`     Full error:`, JSON.stringify(error));
      } else {
        console.log(`  ✅ Upload OK in ${Date.now()-t0}ms`);
        await supabase.storage.from('event-images').remove([path]);
        console.log(`  🧹 Cleaned up`);
      }
    } catch (err) {
      console.log(`  ❌ Upload threw (${Date.now()-t0}ms): ${err.name}: "${err.message}"`);
    }
  }

  // 4c. Concurrent uploads (10 simultaneous — like real scraper)
  console.log(`\n  Concurrent upload test (10 simultaneous)...`);
  const validBufs = buffers.filter(Boolean);
  const testBufs = Array.from({ length: 10 }, (_, i) => validBufs[i % validBufs.length]);
  const ts = Date.now();
  const upResults = await Promise.allSettled(
    testBufs.map((item, i) =>
      supabase.storage
        .from('event-images')
        .upload(`events/test-conc-${i}-${ts}.jpg`, item.buf, { contentType: 'image/jpeg', upsert: true })
    )
  );
  const uOk = upResults.filter(r => r.status === 'fulfilled' && !r.value?.error).length;
  const uFail = upResults.length - uOk;
  console.log(`  ${uOk} ✅  ${uFail} ❌  — total ${Date.now()-ts}ms`);
  upResults.forEach((r, i) => {
    const err = r.reason || r.value?.error;
    if (err) console.log(`    Upload #${i}: ❌ "${err.message || err}"`);
  });
  // Cleanup
  await supabase.storage.from('event-images')
    .remove(testBufs.map((_, i) => `events/test-conc-${i}-${ts}.jpg`));
}

await browser.close();
console.log('\n✅ All tests complete.');
