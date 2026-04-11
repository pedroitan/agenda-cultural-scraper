import 'dotenv/config'
import { ApifyAdapter } from './dist/scrapers/instagram-apify/apify-adapter.js'
import { TextProcessor } from './dist/scrapers/instagram-apify/text-processor.js'
import { EventAggregator } from './dist/scrapers/instagram-apify/event-aggregator.js'

async function testSpecificPost() {
  console.log('\n🧪 Testing Specific Instagram Post\n')
  console.log('Post: https://www.instagram.com/p/DWXSi-ZEnok/')
  console.log('='.repeat(70))
  
  const apifyToken = process.env.APIFY_TOKEN
  
  if (!apifyToken) {
    console.error('\n❌ APIFY_TOKEN not found')
    process.exit(1)
  }
  
  // 1. Buscar posts via Apify
  console.log('\n📱 Fetching posts from Instagram...')
  const adapter = new ApifyAdapter(apifyToken)
  
  const posts = await adapter.getInstagramPosts({
    username: 'agendaalternativasalvador',
    maxPosts: 20, // Buscar últimos 20 posts
  })
  
  console.log(`✅ Fetched ${posts.length} posts\n`)
  
  // 2. Encontrar o post específico ou usar o mais recente
  let targetPost = posts.find(p => p.url.includes('DWXSi-ZEnok'))
  
  if (!targetPost && posts.length > 0) {
    console.log('⚠️  Post específico não encontrado, usando post mais recente')
    targetPost = posts[0]
  }
  
  if (!targetPost) {
    console.error('❌ No posts found')
    process.exit(1)
  }
  
  console.log('📄 Processing post:')
  console.log(`   ID: ${targetPost.id}`)
  console.log(`   URL: ${targetPost.url}`)
  console.log(`   Caption length: ${targetPost.caption.length} chars`)
  console.log(`   Images: ${targetPost.images.length}`)
  console.log(`   Likes: ${targetPost.likesCount || 0}`)
  
  // 3. Processar caption
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
  
  // 4. Estatísticas
  const aggregator = new EventAggregator()
  const stats = aggregator.getStats(events)
  
  console.log('='.repeat(70))
  console.log('\n📊 Statistics:')
  console.log(`   Total: ${stats.total}`)
  console.log(`   Free: ${stats.free}`)
  console.log(`   Paid: ${stats.paid}`)
  
  console.log('\n✅ Test completed!\n')
}

testSpecificPost().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
