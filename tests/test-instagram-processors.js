import { ContentDetector } from './dist/scrapers/instagram-apify/content-detector.js'
import { TextProcessor } from './dist/scrapers/instagram-apify/text-processor.js'
import { EventAggregator } from './dist/scrapers/instagram-apify/event-aggregator.js'

const samplePost = {
  id: 'test-1',
  type: 'post',
  caption: `🎭 SEXTA-FEIRA (30/01)

Disconnected
📍 Só Shape - Rio Vermelho
⏰ 21:00
💰 Grátis

Festa Proibida - Wil Da Nilo & Discodelia DJs
📍 Discodelia Pub - Rio Vermelho
⏰ 19:00
💰 Grátis

Keko Beatz e Baianos
📍 ECO - Rio Vermelho
⏰ 21:00
💰 Grátis (entrada gratuita até às 20h)`,
  images: [],
  timestamp: new Date().toISOString(),
  url: 'https://instagram.com/p/test-1',
  likesCount: 150,
}

async function runTests() {
  console.log('\n🚀 Testing Instagram Apify Processors\n')
  console.log('='.repeat(60))
  
  // Test ContentDetector
  console.log('\n📋 1. ContentDetector\n')
  const detector = new ContentDetector()
  const metadata = detector.detect(samplePost)
  console.log('  Type:', metadata.type)
  console.log('  Has Caption:', metadata.hasCaption)
  console.log('  Has Images:', metadata.hasImages)
  console.log('  Quality Score:', detector.estimateQuality(samplePost, metadata))
  
  // Test TextProcessor
  console.log('\n\n📝 2. TextProcessor\n')
  const textProcessor = new TextProcessor()
  const events = await textProcessor.extractEvents(samplePost.caption, samplePost.url)
  console.log(`  Extracted ${events.length} events:\n`)
  
  events.forEach((event, i) => {
    console.log(`  ${i + 1}. ${event.title}`)
    console.log(`     📅 ${event.date} às ${event.time}`)
    console.log(`     📍 ${event.venue}`)
    console.log(`     💰 ${event.price}\n`)
  })
  
  // Test EventAggregator
  console.log('\n🔄 3. EventAggregator\n')
  const aggregator = new EventAggregator()
  
  // Create duplicates
  const duplicates = [...events, ...events]
  console.log(`  Before deduplication: ${duplicates.length} events`)
  
  const unique = aggregator.deduplicate(duplicates)
  console.log(`  After deduplication: ${unique.length} events`)
  
  const stats = aggregator.getStats(unique)
  console.log(`\n  📊 Statistics:`)
  console.log(`     Total: ${stats.total}`)
  console.log(`     Free: ${stats.free}`)
  console.log(`     Paid: ${stats.paid}`)
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ All tests completed successfully!\n')
}

runTests().catch(console.error)
