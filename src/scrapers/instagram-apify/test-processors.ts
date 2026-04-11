import { ContentDetector } from './content-detector.js'
import { TextProcessor } from './text-processor.js'
import { EventAggregator } from './event-aggregator.js'
import type { InstagramPost } from '../../types/instagram.types.js'

// Exemplo de post com texto estruturado (baseado em posts reais)
const sampleTextPost: InstagramPost = {
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

const sampleImagePost: InstagramPost = {
  id: 'test-2',
  type: 'post',
  caption: 'Confira os eventos deste fim de semana! 🎉',
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
  ],
  timestamp: new Date().toISOString(),
  url: 'https://instagram.com/p/test-2',
  likesCount: 320,
}

async function testContentDetector() {
  console.log('\n🧪 Testing ContentDetector\n')
  console.log('=' .repeat(50))
  
  const detector = new ContentDetector()
  
  // Test 1: Text post
  const metadata1 = detector.detect(sampleTextPost)
  console.log('\n📝 Text Post:')
  console.log('  Type:', metadata1.type)
  console.log('  Has Caption:', metadata1.hasCaption)
  console.log('  Has Images:', metadata1.hasImages)
  console.log('  Image Count:', metadata1.imageCount)
  console.log('  Quality Score:', detector.estimateQuality(sampleTextPost, metadata1))
  
  // Test 2: Image post
  const metadata2 = detector.detect(sampleImagePost)
  console.log('\n🖼️  Image Post:')
  console.log('  Type:', metadata2.type)
  console.log('  Has Caption:', metadata2.hasCaption)
  console.log('  Has Images:', metadata2.hasImages)
  console.log('  Image Count:', metadata2.imageCount)
  console.log('  Quality Score:', detector.estimateQuality(sampleImagePost, metadata2))
}

async function testTextProcessor() {
  console.log('\n\n🧪 Testing TextProcessor\n')
  console.log('=' .repeat(50))
  
  const processor = new TextProcessor()
  
  const events = await processor.extractEvents(
    sampleTextPost.caption,
    sampleTextPost.url
  )
  
  console.log(`\n✅ Extracted ${events.length} events:\n`)
  
  events.forEach((event, i) => {
    console.log(`${i + 1}. ${event.title}`)
    console.log(`   📅 ${event.date} às ${event.time}`)
    console.log(`   📍 ${event.venue}`)
    console.log(`   💰 ${event.price}`)
    if (event.description) {
      console.log(`   📝 ${event.description}`)
    }
    console.log()
  })
  
  // Test date context detection
  const dateContexts = processor.detectDateContext(sampleTextPost.caption)
  console.log('📅 Date contexts found:')
  dateContexts.forEach((date, day) => {
    console.log(`   ${day}: ${date}`)
  })
}

async function testEventAggregator() {
  console.log('\n\n🧪 Testing EventAggregator\n')
  console.log('=' .repeat(50))
  
  const aggregator = new EventAggregator()
  const processor = new TextProcessor()
  
  // Extract events
  const events = await processor.extractEvents(
    sampleTextPost.caption,
    sampleTextPost.url
  )
  
  // Create some duplicates for testing
  const duplicateEvents = [
    ...events,
    ...events.map(e => ({ ...e, title: e.title.toLowerCase() })), // Duplicate with different case
  ]
  
  console.log(`\n📊 Before deduplication: ${duplicateEvents.length} events`)
  
  const uniqueEvents = aggregator.deduplicate(duplicateEvents)
  console.log(`✅ After deduplication: ${uniqueEvents.length} events`)
  
  // Sort events
  const sortedEvents = aggregator.sort(uniqueEvents)
  console.log('\n📅 Events sorted by date/time:')
  sortedEvents.forEach((event, i) => {
    console.log(`   ${i + 1}. ${event.title} - ${event.date} ${event.time}`)
  })
  
  // Get statistics
  const stats = aggregator.getStats(uniqueEvents)
  console.log('\n📈 Statistics:')
  console.log(`   Total: ${stats.total}`)
  console.log(`   Free: ${stats.free}`)
  console.log(`   Paid: ${stats.paid}`)
  console.log('\n   By date:')
  stats.byDate.forEach((count, date) => {
    console.log(`     ${date}: ${count} event(s)`)
  })
  
  // Group by date
  const grouped = aggregator.groupByDate(uniqueEvents)
  console.log('\n📅 Grouped by date:')
  grouped.forEach((events, date) => {
    console.log(`   ${date}: ${events.length} event(s)`)
  })
}

async function runAllTests() {
  console.log('\n🚀 Running Instagram Apify Processor Tests\n')
  
  try {
    await testContentDetector()
    await testTextProcessor()
    await testEventAggregator()
    
    console.log('\n\n✅ All tests completed successfully!\n')
  } catch (error) {
    console.error('\n\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
}

export { runAllTests }
