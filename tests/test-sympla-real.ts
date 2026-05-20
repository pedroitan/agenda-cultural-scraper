import { chromium } from 'playwright'
import { extractEventFromHtml } from './src/sympla.js'

// Test with a real Sympla event page
const testUrl = 'https://www.sympla.com.br/evento/show-teste-123456'

console.log('Testing Sympla event detail extraction...')
console.log('URL:', testUrl)
console.log('')

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 })
  const html = await page.content()
  
  console.log('HTML length:', html.length)
  
  // Check if __NEXT_DATA__ exists
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    console.log('✓ __NEXT_DATA__ found')
    const nextData = JSON.parse(nextDataMatch[1])
    console.log('Page props keys:', Object.keys(nextData?.props?.pageProps || {}).join(', '))
    
    // Show event data structure
    const eventData = nextData?.props?.pageProps?.event || nextData?.props?.pageProps?.data || nextData?.props?.pageProps
    console.log('Event data keys:', eventData ? Object.keys(eventData).join(', ') : 'NOT FOUND')
    
    if (eventData) {
      console.log('\nEvent data sample:')
      console.log('  name:', eventData.name || eventData.title)
      console.log('  description:', eventData.description || eventData.description_text || eventData.long_description || eventData.summary || 'NOT FOUND')
      console.log('  artists:', eventData.artists || eventData.performers || eventData.lineup || 'NOT FOUND')
      console.log('  duration:', eventData.duration || eventData.expected_duration || 'NOT FOUND')
      console.log('  age_restriction:', eventData.age_restriction || eventData.ageRestriction || eventData.classification || eventData.rating || 'NOT FOUND')
      console.log('  organizer:', eventData.organizer?.name || eventData.organization?.name || eventData.producer?.name || 'NOT FOUND')
    }
  } else {
    console.log('✗ __NEXT_DATA__ NOT FOUND')
  }
  
  // Try extraction
  const input = { source: 'sympla' as const, city: 'salvador' as const }
  const eventId = 'test-123456'
  const result = extractEventFromHtml(html, eventId, testUrl, input)
  
  console.log('\nExtraction result:')
  console.log('  Title:', result?.title)
  console.log('  Description:', result?.description?.slice(0, 100) || 'NOT FOUND')
  console.log('  Performers:', result?.performers || 'NOT FOUND')
  console.log('  Duration:', result?.duration || 'NOT FOUND')
  console.log('  Age restriction:', result?.age_restriction || 'NOT FOUND')
  console.log('  Organizer:', result?.organizer || 'NOT FOUND')
  
} catch (err) {
  console.error('Error:', err)
} finally {
  await browser.close()
}
