import 'dotenv/config'
import { ApifyAdapter } from './dist/scrapers/instagram-apify/apify-adapter.js'

async function testRawCaption() {
  console.log('\n🔍 Checking RAW Caption Content\n')
  console.log('='.repeat(70))
  
  const apifyToken = process.env.APIFY_TOKEN
  const adapter = new ApifyAdapter(apifyToken)
  
  const posts = await adapter.getInstagramPosts({
    username: 'agendaalternativasalvador',
    maxPosts: 20,
  })
  
  const targetPost = posts.find(p => p.url.includes('DWXSi-ZEnok')) || posts[0]
  
  console.log(`\n📄 Post: ${targetPost.url}`)
  console.log(`📏 Caption length: ${targetPost.caption.length} chars\n`)
  console.log('='.repeat(70))
  console.log('FULL CAPTION:')
  console.log('='.repeat(70))
  console.log(targetPost.caption)
  console.log('='.repeat(70))
  
  // Buscar eventos específicos
  const hasSerieSSinfonica = targetPost.caption.includes('Série Salvador Sinfônica')
  const hasLetsDance = targetPost.caption.includes("Let's Dance")
  const hasRogerNRoll = targetPost.caption.includes("Roger'n Roll")
  
  console.log(`\n🔍 Searching for missing events:`)
  console.log(`   "Série Salvador Sinfônica": ${hasSerieSSinfonica ? '✅ FOUND' : '❌ NOT FOUND'}`)
  console.log(`   "Let's Dance": ${hasLetsDance ? '✅ FOUND' : '❌ NOT FOUND'}`)
  console.log(`   "Roger'n Roll": ${hasRogerNRoll ? '✅ FOUND' : '❌ NOT FOUND'}`)
  
  // Contar separadores
  const separatorCount = (targetPost.caption.match(/_____________________________/g) || []).length
  console.log(`\n📊 Separator count: ${separatorCount}`)
  console.log(`   Expected blocks: ${separatorCount + 1}`)
}

testRawCaption().catch(console.error)
