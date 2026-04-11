import 'dotenv/config'
import { ApifyAdapter } from '../dist/scrapers/instagram-apify/apify-adapter.js'
import fs from 'fs'
import path from 'path'

/**
 * Script para buscar posts do Instagram via Apify e salvar em cache local
 * Uso: node scripts/fetch-instagram-posts.js
 * 
 * Isso economiza créditos do Apify - roda 1x para buscar, depois processa N vezes
 */

async function fetchAndCachePosts() {
  console.log('\n📱 Fetching Instagram Posts via Apify\n')
  console.log('='.repeat(70))
  
  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    console.error('❌ APIFY_TOKEN not found in .env')
    process.exit(1)
  }
  
  const adapter = new ApifyAdapter(apifyToken)
  
  // Configuração
  const username = 'agendaalternativasalvador'
  const maxPosts = 20
  
  console.log(`\n⚙️  Configuration:`)
  console.log(`   Username: @${username}`)
  console.log(`   Max posts: ${maxPosts}`)
  console.log(`   Comments: enabled (up to 50 per post)`)
  
  // Buscar posts
  console.log(`\n🔄 Fetching posts from Apify...`)
  const startTime = Date.now()
  
  const posts = await adapter.getInstagramPosts({
    username,
    maxPosts,
  })
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  
  console.log(`\n✅ Fetched ${posts.length} posts in ${duration}s`)
  
  // Estatísticas
  const totalComments = posts.reduce((sum, p) => {
    const commentCount = (p.caption.match(/📝 Found \d+ author comments/g) || []).length
    return sum + commentCount
  }, 0)
  
  const totalCaptionLength = posts.reduce((sum, p) => sum + p.caption.length, 0)
  
  console.log(`\n📊 Statistics:`)
  console.log(`   Total posts: ${posts.length}`)
  console.log(`   Posts with author comments: ${posts.filter(p => p.caption.includes('📝 Found')).length}`)
  console.log(`   Total caption length: ${totalCaptionLength.toLocaleString()} chars`)
  console.log(`   Average caption length: ${Math.round(totalCaptionLength / posts.length)} chars`)
  
  // Preparar dados para cache
  const cacheData = {
    fetchedAt: new Date().toISOString(),
    username,
    postsCount: posts.length,
    posts: posts.map(post => ({
      id: post.id,
      url: post.url,
      caption: post.caption,
      images: post.images,
      timestamp: post.timestamp,
      likes: post.likes,
    }))
  }
  
  // Criar diretório cache se não existir
  const cacheDir = path.join(process.cwd(), 'cache')
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  
  // Salvar em arquivo JSON
  const cacheFile = path.join(cacheDir, 'instagram-posts.json')
  fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))
  
  console.log(`\n💾 Cache saved:`)
  console.log(`   File: ${cacheFile}`)
  console.log(`   Size: ${(fs.statSync(cacheFile).size / 1024).toFixed(1)} KB`)
  
  console.log(`\n✅ Done! Posts cached successfully.`)
  console.log(`\n💡 Next step: Run 'node scripts/process-cached-posts.js' to extract events`)
  console.log('='.repeat(70))
  console.log()
}

fetchAndCachePosts().catch(error => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
