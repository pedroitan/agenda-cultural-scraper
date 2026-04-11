import { chromium } from 'playwright';

async function testElCabongFix() {
  console.log('🧪 Testing El Cabong scraper fix...\n');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  try {
    console.log('📄 Loading page...');
    await page.goto('https://elcabong.com.br/agenda/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForSelector('.wpem-event-box-col', { timeout: 15000 });
    
    const events = await page.evaluate(() => {
      const results = [];
      const eventElements = document.querySelectorAll('.wpem-event-box-col');
      
      eventElements.forEach(event => {
        const title = event.querySelector('.wpem-event-title')?.textContent?.trim() || null;
        const datetime = event.querySelector('.wpem-event-date-time')?.textContent?.trim() || null;
        const [date, time] = datetime ? datetime.split(' - ') : [null, null];
        const location = event.querySelector('.wpem-event-location')?.textContent?.trim() || null;
        const link = event.querySelector('a.wpem-event-action-url')?.href || null;
        const bannerImg = event.querySelector('.wpem-event-banner-img');
        
        // NEW FIX: Try SpeedyCache attribute first, then background-image
        let imageUrl = bannerImg?.getAttribute('data-speedycache-original-src') || null;
        if (!imageUrl) {
          imageUrl = bannerImg?.style?.backgroundImage
            ?.replace(/url\(["']?/, '')
            ?.replace(/["']?\)$/, '') || null;
        }

        if (title && date && location && link) {
          results.push({
            title,
            date: date?.trim() || null,
            time: time?.trim() || null,
            location,
            url: link,
            imageUrl,
            hasImage: !!imageUrl
          });
        }
      });

      return results;
    });

    console.log(`✅ Found ${events.length} events\n`);
    
    const withImages = events.filter(e => e.hasImage).length;
    const withoutImages = events.filter(e => !e.hasImage).length;
    
    console.log(`📊 Statistics:`);
    console.log(`   Events with images: ${withImages}`);
    console.log(`   Events without images: ${withoutImages}`);
    console.log(`   Success rate: ${((withImages / events.length) * 100).toFixed(1)}%\n`);

    console.log(`📋 Sample events:\n`);
    events.slice(0, 3).forEach((event, i) => {
      console.log(`${i + 1}. ${event.title}`);
      console.log(`   Date: ${event.date} ${event.time || ''}`);
      console.log(`   Location: ${event.location}`);
      console.log(`   Image: ${event.hasImage ? '✅ ' + event.imageUrl?.substring(0, 60) + '...' : '❌ Missing'}`);
      console.log('');
    });

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

testElCabongFix();
