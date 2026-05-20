import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ssxowzurrtyzmracmusn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY not set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixElCabongImages() {
  console.log('🔧 Fixing El Cabong images and URLs...\n');

  // 1. Fetch fresh data from El Cabong
  console.log('📥 Scraping fresh data from El Cabong...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const freshEvents = [];

  try {
    await page.goto('https://elcabong.com.br/agenda/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Close popup
    await page.waitForTimeout(2000);
    const closeSelectors = ['.popup-close', '.modal-close', '[aria-label="Close"]', 'button[class*="close"]'];
    for (const selector of closeSelectors) {
      const closeButton = page.locator(selector).first();
      if (await closeButton.count() > 0 && await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        break;
      }
    }
    
    await page.waitForSelector('.wpem-event-box-col', { timeout: 15000 });
    
    // Load all events
    let loadMoreAttempts = 0;
    while (loadMoreAttempts < 50) {
      const prevCount = await page.locator('.wpem-event-box-col').count();
      const button = page.locator('#load_more_events');
      
      if (await button.count() === 0) break;
      
      try {
        await button.click({ timeout: 5000 });
      } catch {
        break;
      }
      
      await page.waitForTimeout(2000);
      const newCount = await page.locator('.wpem-event-box-col').count();
      
      if (newCount <= prevCount) break;
      loadMoreAttempts++;
    }
    
    console.log(`✅ Loaded all events (clicked ${loadMoreAttempts} times)`);
    
    // Extract all events
    const events = await page.evaluate(() => {
      const results = [];
      const eventElements = document.querySelectorAll('.wpem-event-box-col');
      
      eventElements.forEach(event => {
        const title = event.querySelector('.wpem-event-title')?.textContent?.trim();
        const datetime = event.querySelector('.wpem-event-date-time')?.textContent?.trim();
        const location = event.querySelector('.wpem-event-location')?.textContent?.trim();
        const link = event.querySelector('a.wpem-event-action-url')?.href;
        const bannerImg = event.querySelector('.wpem-event-banner-img');
        
        let imageUrl = bannerImg?.getAttribute('data-speedycache-original-src') || null;
        if (!imageUrl) {
          imageUrl = bannerImg?.style?.backgroundImage
            ?.replace(/url\(["']?/, '')
            ?.replace(/["']?\)$/, '') || null;
        }

        if (title && datetime && location && link) {
          results.push({ title, datetime, location, link, imageUrl });
        }
      });
      
      return results;
    });
    
    console.log(`✅ Found ${events.length} events on site\n`);
    freshEvents.push(...events);
    
  } catch (err) {
    console.error('❌ Error scraping:', err);
  } finally {
    await browser.close();
  }

  if (freshEvents.length === 0) {
    console.log('⚠️  No events found, aborting');
    return;
  }

  // 2. Get El Cabong events from database
  console.log('📊 Fetching El Cabong events from database...');
  const { data: dbEvents, error } = await supabase
    .from('events')
    .select('*')
    .eq('source', 'elcabong')
    .gte('start_datetime', new Date().toISOString());

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  console.log(`✅ Found ${dbEvents?.length || 0} El Cabong events in database\n`);

  // 3. Match and update
  let updated = 0;
  let skipped = 0;

  for (const dbEvent of dbEvents || []) {
    // Try to find matching event by title
    const match = freshEvents.find(fe => 
      fe.title.toLowerCase().includes(dbEvent.title.toLowerCase().substring(0, 20)) ||
      dbEvent.title.toLowerCase().includes(fe.title.toLowerCase().substring(0, 20))
    );

    if (match) {
      const needsUpdate = !dbEvent.image_url || dbEvent.url === 'https://elcabong.com.br/agenda/';
      
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('events')
          .update({
            image_url: match.imageUrl,
            url: match.link,
          })
          .eq('id', dbEvent.id);

        if (updateError) {
          console.error(`❌ Error updating ${dbEvent.title}:`, updateError);
        } else {
          console.log(`✅ Updated: ${dbEvent.title.substring(0, 50)}...`);
          console.log(`   Image: ${match.imageUrl ? '✓' : '✗'}`);
          console.log(`   URL: ${match.link}`);
          updated++;
        }
      } else {
        skipped++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (already OK): ${skipped}`);
  console.log(`   Total: ${dbEvents?.length || 0}`);
}

fixElCabongImages();
