import 'dotenv/config'
import { ApifyAdapter } from './apify-adapter.js'

async function testApifyConnection() {
  console.log('\n🧪 Testing Apify Connection\n')
  console.log('='.repeat(60))
  
  const token = process.env.APIFY_TOKEN
  
  if (!token) {
    console.error('\n❌ APIFY_TOKEN not found in environment variables')
    console.log('\nPlease add to .env file:')
    console.log('APIFY_TOKEN=apify_api_xxxxxxxxxxxxx\n')
    process.exit(1)
  }
  
  console.log(`\n🔑 Token found: ${token.substring(0, 15)}...`)
  
  const adapter = new ApifyAdapter(token)
  
  // Test 1: Connection
  console.log('\n📡 Testing connection...')
  const connected = await adapter.testConnection()
  
  if (!connected) {
    console.error('\n❌ Failed to connect to Apify')
    process.exit(1)
  }
  
  // Test 2: Credits
  console.log('\n💰 Checking credits...')
  await adapter.checkCredits()
  
  // Test 3: Fetch posts (small test)
  console.log('\n📱 Testing Instagram post fetch (3 posts)...')
  try {
    const posts = await adapter.getInstagramPosts({
      username: 'agendaalternativasalvador',
      maxPosts: 3,
    })
    
    console.log(`\n✅ Successfully fetched ${posts.length} posts:\n`)
    
    posts.forEach((post, i) => {
      console.log(`${i + 1}. Post ${post.id}`)
      console.log(`   URL: ${post.url}`)
      console.log(`   Caption: ${post.caption.substring(0, 100)}...`)
      console.log(`   Images: ${post.images.length}`)
      console.log(`   Likes: ${post.likesCount || 0}`)
      console.log()
    })
    
  } catch (error) {
    console.error('\n❌ Failed to fetch posts:', error)
    process.exit(1)
  }
  
  console.log('='.repeat(60))
  console.log('\n✅ All tests passed! Apify is ready to use.\n')
}

testApifyConnection().catch(error => {
  console.error('\n❌ Test failed:', error)
  process.exit(1)
})
