import { chromium } from 'playwright';

async function debugElCabongDates() {
  console.log('🔍 Debugging El Cabong date formats...\n');

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  try {
    await page.goto('https://elcabong.com.br/agenda/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForSelector('.wpem-event-box-col', { timeout: 15000 });
    
    const dateFormats = await page.evaluate(() => {
      const results = [];
      const eventElements = document.querySelectorAll('.wpem-event-box-col');
      
      // Check first 10 events
      for (let i = 0; i < Math.min(10, eventElements.length); i++) {
        const event = eventElements[i];
        const title = event.querySelector('.wpem-event-title')?.textContent?.trim();
        const datetime = event.querySelector('.wpem-event-date-time')?.textContent?.trim();
        
        results.push({
          index: i + 1,
          title,
          datetime,
          datetimeLength: datetime?.length || 0
        });
      }
      
      return results;
    });

    console.log('📅 Date formats from first 10 events:\n');
    dateFormats.forEach(event => {
      console.log(`${event.index}. ${event.title}`);
      console.log(`   DateTime: "${event.datetime}"`);
      console.log(`   Length: ${event.datetimeLength} chars`);
      console.log('');
    });

    // Test parsing function
    console.log('\n🧪 Testing current parseElCabongDate function:\n');
    
    function parseElCabongDate(dateStr) {
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/);
      if (!match) return null;

      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      const hour = match[4] ? match[4].padStart(2, '0') : '20';
      const minute = match[5] || '00';

      return `${year}-${month}-${day}T${hour}:${minute}:00`;
    }

    dateFormats.forEach(event => {
      const parsed = parseElCabongDate(event.datetime || '');
      console.log(`${event.index}. ${event.datetime}`);
      console.log(`   Parsed: ${parsed || '❌ FAILED'}`);
      console.log('');
    });

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

debugElCabongDates();
