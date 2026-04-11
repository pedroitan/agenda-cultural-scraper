import 'dotenv/config'
import { ApifyAdapter } from './dist/scrapers/instagram-apify/apify-adapter.js'
import { TextProcessor } from './dist/scrapers/instagram-apify/text-processor.js'

async function testDateExtraction() {
  console.log('\n🔍 Testing Date Extraction\n')
  console.log('='.repeat(70))
  
  const apifyToken = process.env.APIFY_TOKEN
  const adapter = new ApifyAdapter(apifyToken)
  
  console.log('\n📱 Fetching posts from Instagram...')
  const posts = await adapter.getInstagramPosts({
    username: 'agendaalternativasalvador',
    maxPosts: 5,
  })
  
  console.log(`✅ Fetched ${posts.length} posts\n`)
  console.log('='.repeat(70))
  
  const processor = new TextProcessor()
  
  for (const post of posts.slice(0, 3)) {
    console.log(`\n📄 Post: ${post.url}`)
    console.log(`   Caption preview: ${post.caption.substring(0, 150)}...`)
    
    // Processar eventos
    const events = await processor.extractEvents(post.caption, post.url)
    
    if (events.length > 0) {
      console.log(`   ✅ Extracted ${events.length} events`)
      console.log(`   📅 First event date: ${events[0].date}`)
    } else {
      console.log(`   ⚠️  No events extracted`)
    }
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('\n✅ Test completed!\n')
}

testDateExtraction().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
