import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ssxowzurrtyzmracmusn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testElCabongData() {
  console.log('🔍 Testing El Cabong data in database...\n');

  // 1. Check events in database
  const { data: dbEvents, error } = await supabase
    .from('events')
    .select('*')
    .eq('source', 'elcabong')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  console.log(`📊 Found ${dbEvents?.length || 0} El Cabong events in database\n`);

  if (dbEvents && dbEvents.length > 0) {
    console.log('📋 Sample events from database:\n');
    dbEvents.forEach((event, i) => {
      console.log(`${i + 1}. ${event.title}`);
      console.log(`   Image URL: ${event.image_url || '❌ NULL'}`);
      console.log(`   Event URL: ${event.url || '❌ NULL'}`);
      console.log(`   Venue: ${event.venue_name || 'N/A'}`);
      console.log(`   Date: ${event.start_datetime}`);
      console.log('');
    });
  }

  // 2. Scrape fresh data to compare
  console.log('\n🌐 Fetching fresh data from El Cabong site...\n');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  try {
    await page.goto('https://elcabong.com.br/agenda/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    await page.waitForSelector('.wpem-event-box-col', { timeout: 15000 });
    
    const liveEvents = await page.evaluate(() => {
      const results = [];
      const eventElements = document.querySelectorAll('.wpem-event-box-col');
      
      for (let i = 0; i < Math.min(5, eventElements.length); i++) {
        const event = eventElements[i];
        const title = event.querySelector('.wpem-event-title')?.textContent?.trim();
        const link = event.querySelector('a.wpem-event-action-url')?.href;
        const bannerImg = event.querySelector('.wpem-event-banner-img');
        
        let imageUrl = bannerImg?.getAttribute('data-speedycache-original-src') || null;
        if (!imageUrl) {
          imageUrl = bannerImg?.style?.backgroundImage
            ?.replace(/url\(["']?/, '')
            ?.replace(/["']?\)$/, '') || null;
        }

        results.push({ title, imageUrl, link });
      }
      
      return results;
    });

    console.log('📋 Fresh data from site:\n');
    liveEvents.forEach((event, i) => {
      console.log(`${i + 1}. ${event.title}`);
      console.log(`   Image URL: ${event.imageUrl || '❌ NULL'}`);
      console.log(`   Event URL: ${event.link || '❌ NULL'}`);
      console.log('');
    });

    // 3. Compare
    console.log('\n🔍 Comparison:\n');
    if (dbEvents && dbEvents.length > 0 && liveEvents.length > 0) {
      const dbHasImages = dbEvents.filter(e => e.image_url).length;
      const liveHasImages = liveEvents.filter(e => e.imageUrl).length;
      
      console.log(`Database events with images: ${dbHasImages}/${dbEvents.length}`);
      console.log(`Live events with images: ${liveHasImages}/${liveEvents.length}`);
      
      if (dbHasImages === 0 && liveHasImages > 0) {
        console.log('\n⚠️  ISSUE: Database has NO images but site has images!');
        console.log('   This means the scraper is not capturing images correctly.');
      } else if (dbHasImages > 0) {
        console.log('\n✅ Database has images - checking if they are valid URLs...');
        const sampleUrl = dbEvents[0].image_url;
        console.log(`   Sample URL: ${sampleUrl}`);
        
        if (sampleUrl && !sampleUrl.startsWith('http')) {
          console.log('   ❌ Image URL is not a valid HTTP URL!');
        } else {
          console.log('   ✅ Image URL format looks valid');
        }
      }
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

testElCabongData();
