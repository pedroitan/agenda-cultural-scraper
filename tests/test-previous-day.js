import { TextProcessor } from './dist/scrapers/instagram-apify/text-processor.js'
import { EventAggregator } from './dist/scrapers/instagram-apify/event-aggregator.js'

// Cole o caption do post anterior aqui
const previousDayCaption = `
[COLE O CAPTION AQUI]
`

async function testPreviousDayCaption() {
  console.log('\n🧪 Testing TextProcessor with Previous Day Caption\n')
  console.log('='.repeat(70))
  
  const processor = new TextProcessor()
  const events = await processor.extractEvents(previousDayCaption, 'https://instagram.com/p/DWXSi-ZEnok/')
  
  console.log(`\n✅ Extracted ${events.length} events:\n`)
  
  events.forEach((event, i) => {
    console.log(`${i + 1}. ${event.title}`)
    console.log(`   📍 ${event.venue}`)
    console.log(`   ⏰ ${event.time}`)
    console.log(`   💰 ${event.price}`)
    console.log()
  })
  
  // Test aggregator
  const aggregator = new EventAggregator()
  const stats = aggregator.getStats(events)
  
  console.log('='.repeat(70))
  console.log(`\n📊 Statistics:`)
  console.log(`   Total: ${stats.total}`)
  console.log(`   Free: ${stats.free}`)
  console.log(`   Paid: ${stats.paid}`)
  
  const grouped = aggregator.groupByDate(events)
  console.log(`\n📅 Events by date:`)
  grouped.forEach((evts, date) => {
    console.log(`   ${date}: ${evts.length} event(s)`)
  })
  
  console.log('\n')
}

testPreviousDayCaption().catch(console.error)
