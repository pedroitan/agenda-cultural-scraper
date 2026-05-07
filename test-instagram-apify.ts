import 'dotenv/config'
import { InstagramApifyScraper } from './src/scrapers/instagram-apify/instagram-apify-scraper.js'

async function testInstagramApify() {
  console.log('🧪 Testing Instagram Apify Scraper...\n')

  const config = {
    username: process.env.INSTAGRAM_USERNAME || 'agendaalternativasalvador',
    maxPosts: 20, // Buscar últimos 20 posts
    includeStories: false,
    apifyToken: process.env.APIFY_TOKEN || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  }

  if (!config.apifyToken) {
    console.error('❌ APIFY_TOKEN is required')
    process.exit(1)
  }

  const scraper = new InstagramApifyScraper(config)

  try {
    // Testar conexão
    console.log('1️⃣ Testing Apify connection...')
    const connected = await scraper.testConnection()
    if (!connected) {
      console.error('❌ Failed to connect to Apify')
      process.exit(1)
    }

    // Verificar créditos
    console.log('\n2️⃣ Checking Apify credits...')
    const credits = await scraper.checkCredits()
    console.log(`💰 Available credits: ${credits}`)

    if (credits === 0) {
      console.warn('⚠️ No credits available. Scraping may fail.')
    }

    // Executar scrape
    console.log('\n3️⃣ Running Instagram Apify Scraper...')
    const result = await scraper.scrape()

    console.log('\n✅ Test completed!')
    console.log(`   Posts fetched: ${result.items_fetched}`)
    console.log(`   Events extracted: ${result.valid.length}`)
    console.log(`   Stats:`, result.stats)

    if (result.valid.length > 0) {
      console.log(`\n📋 Sample events:`)
      for (const event of result.valid.slice(0, 5)) {
        const hasImage = !!event.image_url
        const source = event.image_url?.includes('profile') ? '👤 Profile Picture' : '🖼️ Post Image'
        console.log(`   - ${event.title}`)
        console.log(`     Image: ${hasImage ? source : '❌ No image'}`)
        console.log(`     URL: ${event.image_url || 'N/A'}`)
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testInstagramApify()
