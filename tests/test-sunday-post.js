import 'dotenv/config'
import { ApifyAdapter } from './dist/scrapers/instagram-apify/apify-adapter.js'
import { TextProcessor } from './dist/scrapers/instagram-apify/text-processor.js'
import { EventAggregator } from './dist/scrapers/instagram-apify/event-aggregator.js'

async function testSundayPost() {
  console.log('\n🧪 Testing Sunday Post\n')
  console.log('Post: https://www.instagram.com/p/DWU12BtjVxi/')
  console.log('='.repeat(70))
  
  const apifyToken = process.env.APIFY_TOKEN
  const adapter = new ApifyAdapter(apifyToken)
  
  console.log('\n📱 Fetching posts from Instagram...')
  const posts = await adapter.getInstagramPosts({
    username: 'agendaalternativasalvador',
    maxPosts: 20,
  })
  
  console.log(`✅ Fetched ${posts.length} posts\n`)
  
  // Encontrar o post específico
  let targetPost = posts.find(p => p.url.includes('DWU12BtjVxi'))
  
  if (!targetPost) {
    console.log('⚠️  Post específico não encontrado')
    console.log('Posts disponíveis:')
    posts.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.url}`)
    })
    process.exit(1)
  }
  
  console.log('📄 Processing post:')
  console.log(`   ID: ${targetPost.id}`)
  console.log(`   URL: ${targetPost.url}`)
  console.log(`   Caption length: ${targetPost.caption.length} chars`)
  console.log(`   Images: ${targetPost.images.length}`)
  
  // Processar caption
  console.log('\n📝 Extracting events from caption...\n')
  const processor = new TextProcessor()
  const events = await processor.extractEvents(targetPost.caption, targetPost.url)
  
  console.log(`✅ Extracted ${events.length} events:\n`)
  
  events.forEach((event, i) => {
    console.log(`${i + 1}. ${event.title}`)
    console.log(`   📍 ${event.venue}`)
    console.log(`   ⏰ ${event.time}`)
    console.log(`   💰 ${event.price}`)
    console.log()
  })
  
  // Estatísticas
  const aggregator = new EventAggregator()
  const stats = aggregator.getStats(events)
  
  console.log('='.repeat(70))
  console.log('\n📊 Statistics:')
  console.log(`   Total: ${stats.total}`)
  console.log(`   Free: ${stats.free}`)
  console.log(`   Paid: ${stats.paid}`)
  
  console.log('\n✅ Test completed!\n')
}

testSundayPost().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
