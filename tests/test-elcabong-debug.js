import { chromium } from 'playwright';

async function debugElCabong() {
  console.log('🔍 Debugging El Cabong scraper...\n');

  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
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
    
    console.log('✅ Page loaded\n');

    // Wait for events
    await page.waitForSelector('.wpem-event-box-col', { timeout: 15000 });
    
    const eventCount = await page.locator('.wpem-event-box-col').count();
    console.log(`📊 Found ${eventCount} events initially\n`);

    // Debug first 3 events
    const debugInfo = await page.evaluate(() => {
      const results = [];
      const eventElements = document.querySelectorAll('.wpem-event-box-col');
      
      // Only check first 3 events
      for (let i = 0; i < Math.min(3, eventElements.length); i++) {
        const event = eventElements[i];
        
        const title = event.querySelector('.wpem-event-title')?.textContent?.trim();
        const datetime = event.querySelector('.wpem-event-date-time')?.textContent?.trim();
        const location = event.querySelector('.wpem-event-location')?.textContent?.trim();
        const link = event.querySelector('a.wpem-event-action-url')?.href;
        
        // Check multiple image sources
        const bannerImg = event.querySelector('.wpem-event-banner-img');
        const imgTag = event.querySelector('img');
        
        const imageInfo = {
          hasBackgroundImage: !!bannerImg?.style?.backgroundImage,
          backgroundImageValue: bannerImg?.style?.backgroundImage || null,
          hasImgTag: !!imgTag,
          imgSrc: imgTag?.src || null,
          imgDataSrc: imgTag?.getAttribute('data-src') || null,
          bannerImgHTML: bannerImg?.outerHTML?.substring(0, 200) || null,
          imgTagHTML: imgTag?.outerHTML?.substring(0, 200) || null,
        };

        results.push({
          index: i + 1,
          title,
          datetime,
          location,
          link,
          imageInfo
        });
      }
      
      return results;
    });

    console.log('🔍 Debug Info for First 3 Events:\n');
    debugInfo.forEach(event => {
      console.log(`Event ${event.index}:`);
      console.log(`  Title: ${event.title}`);
      console.log(`  Date/Time: ${event.datetime}`);
      console.log(`  Location: ${event.location}`);
      console.log(`  Link: ${event.link}`);
      console.log(`  Image Info:`);
      console.log(`    Has background-image: ${event.imageInfo.hasBackgroundImage}`);
      console.log(`    Background value: ${event.imageInfo.backgroundImageValue}`);
      console.log(`    Has <img> tag: ${event.imageInfo.hasImgTag}`);
      console.log(`    <img> src: ${event.imageInfo.imgSrc}`);
      console.log(`    <img> data-src: ${event.imageInfo.imgDataSrc}`);
      if (event.imageInfo.bannerImgHTML) {
        console.log(`    Banner HTML: ${event.imageInfo.bannerImgHTML}`);
      }
      if (event.imageInfo.imgTagHTML) {
        console.log(`    Img HTML: ${event.imageInfo.imgTagHTML}`);
      }
      console.log('');
    });

    console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
    console.log('\n✅ Debug complete');
  }
}

debugElCabong();
