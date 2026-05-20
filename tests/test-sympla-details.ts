import { chromium } from 'playwright'
import { extractEventFromHtml } from './src/sympla.js'

// Test with real Sympla event detail pages (from scraper results)
const testUrls = [
  'https://www.sympla.com.br/evento/blitz-turne-agora-e-a-hora/1944639',
]

console.log('=== Testing Sympla Detail Page Extraction ===\n')

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  for (const url of testUrls) {
    console.log(`Testing: ${url}`)
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    const html = await page.content()
    
    // Check if __NEXT_DATA__ exists
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
      console.log('✓ __NEXT_DATA__ found')
      const nextData = JSON.parse(nextDataMatch[1])
      
      // Show full structure
      console.log('  pageProps keys:', Object.keys(nextData?.props?.pageProps || {}).join(', '))
      
      // Try to find event data in hydrationData
      const hydrationData = nextData?.props?.pageProps?.hydrationData
      if (hydrationData) {
        console.log('  hydrationData keys:', Object.keys(hydrationData).join(', '))
        
        // Look for event in eventHydration
        const eventHydration = hydrationData?.eventHydration
        if (eventHydration) {
          console.log('  eventHydration keys:', Object.keys(eventHydration).join(', '))
          const eventData = eventHydration?.event
          if (eventData) {
            console.log('  Event data found in eventHydration.event')
            console.log('  Event keys:', Object.keys(eventData).join(', '))
            console.log('  Full event data:', JSON.stringify(eventData, null, 2))
          }
        } else {
          console.log('  eventHydration NOT FOUND')
        }
      }
      
      // Also check other possible locations
      const eventData = nextData?.props?.pageProps?.event || nextData?.props?.pageProps?.data || nextData?.props?.pageProps
      if (eventData && eventData !== hydrationData) {
        console.log('  Event data found in pageProps')
        console.log('  Event keys:', Object.keys(eventData).join(', '))
      }
    } else {
      console.log('✗ __NEXT_DATA__ NOT FOUND')
    }
    
    // Try extraction
    const input = { source: 'sympla' as const, city: 'salvador' as const }
    const eventId = url.split('/').pop() || 'unknown'
    const result = extractEventFromHtml(html, eventId, url, input)
    
    console.log('\nExtraction result:')
    console.log('  Title:', result?.title)
    console.log('  Description:', result?.description?.slice(0, 100) || 'NOT FOUND')
    console.log('  Performers:', result?.performers || 'NOT FOUND')
    console.log('  Duration:', result?.duration || 'NOT FOUND')
    console.log('  Age restriction:', result?.age_restriction || 'NOT FOUND')
    console.log('  Organizer:', result?.organizer || 'NOT FOUND')
    
    console.log('\n' + '-'.repeat(60) + '\n')
  }
  
} catch (err) {
  console.error('Error:', err)
} finally {
  await browser.close()
}

console.log('=== Test Complete ===')
