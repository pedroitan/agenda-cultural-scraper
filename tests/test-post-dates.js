import 'dotenv/config'
import { ApifyAdapter } from './dist/scrapers/instagram-apify/apify-adapter.js'

async function testPostDates() {
  console.log('\n🔍 Testing Post Dates\n')
  console.log('='.repeat(70))
  
  const apifyToken = process.env.APIFY_TOKEN
  const adapter = new ApifyAdapter(apifyToken)
  
  console.log('\n📱 Fetching posts from Instagram...')
  const posts = await adapter.getInstagramPosts({
    username: 'agendaalternativasalvador',
    maxPosts: 5, // Apenas 5 para economizar
  })
  
  console.log(`✅ Fetched ${posts.length} posts\n`)
  console.log('='.repeat(70))
  
  posts.forEach((post, i) => {
    console.log(`\n${i + 1}. Post ID: ${post.id}`)
    console.log(`   URL: ${post.url}`)
    console.log(`   Timestamp (Apify): ${post.timestamp}`)
    console.log(`   Caption preview: ${post.caption.substring(0, 100)}...`)
    
    // Tentar extrair data do caption
    const dateMatch = post.caption.match(/♫\s*Agenda\s+de\s+#(\w+),\s+(\d+)\s+de\s+(\w+)/i)
    if (dateMatch) {
      console.log(`   📅 Data no caption: ${dateMatch[1]} (dia da semana), ${dateMatch[2]} de ${dateMatch[3]}`)
    } else {
      console.log(`   ⚠️  Formato de data não encontrado no caption`)
    }
  })
  
  console.log('\n' + '='.repeat(70))
  console.log('\n✅ Test completed!\n')
}

testPostDates().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
