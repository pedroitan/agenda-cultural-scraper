import fs from 'fs'
import path from 'path'

/**
 * Script para visualizar informações do cache
 * Uso: node scripts/view-cache.js
 */

function viewCache() {
  console.log('\n📦 Cache Information\n')
  console.log('='.repeat(70))
  
  const cacheDir = path.join(process.cwd(), 'cache')
  
  if (!fs.existsSync(cacheDir)) {
    console.log('❌ Cache directory not found')
    console.log('\n💡 Run "node scripts/fetch-instagram-posts.js" first')
    return
  }
  
  // Posts cache
  const postsFile = path.join(cacheDir, 'instagram-posts.json')
  if (fs.existsSync(postsFile)) {
    const postsData = JSON.parse(fs.readFileSync(postsFile, 'utf-8'))
    const fileSize = (fs.statSync(postsFile).size / 1024).toFixed(1)
    
    console.log('\n📱 Instagram Posts Cache:')
    console.log(`   File: instagram-posts.json`)
    console.log(`   Size: ${fileSize} KB`)
    console.log(`   Fetched at: ${new Date(postsData.fetchedAt).toLocaleString('pt-BR')}`)
    console.log(`   Username: @${postsData.username}`)
    console.log(`   Posts: ${postsData.postsCount}`)
    
    // Mostrar preview dos posts
    console.log('\n   Posts preview:')
    postsData.posts.slice(0, 5).forEach((post, i) => {
      const preview = post.caption.substring(0, 80).replace(/\n/g, ' ')
      console.log(`   ${i + 1}. ${post.url}`)
      console.log(`      "${preview}..."`)
    })
    
    if (postsData.posts.length > 5) {
      console.log(`   ... and ${postsData.posts.length - 5} more posts`)
    }
  } else {
    console.log('\n📱 Instagram Posts Cache: not found')
  }
  
  // Events cache
  const eventsFile = path.join(cacheDir, 'extracted-events.json')
  if (fs.existsSync(eventsFile)) {
    const eventsData = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'))
    const fileSize = (fs.statSync(eventsFile).size / 1024).toFixed(1)
    
    console.log('\n📝 Extracted Events Cache:')
    console.log(`   File: extracted-events.json`)
    console.log(`   Size: ${fileSize} KB`)
    console.log(`   Processed at: ${new Date(eventsData.processedAt).toLocaleString('pt-BR')}`)
    console.log(`   Total events: ${eventsData.totalEvents}`)
    console.log(`   Free events: ${eventsData.stats.free}`)
    console.log(`   Paid events: ${eventsData.stats.paid}`)
    
    console.log('\n   Events by date:')
    eventsData.eventsByDate.forEach(({ date, count }) => {
      const dateObj = new Date(date)
      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })
      console.log(`   ${date} (${dayName}): ${count} eventos`)
    })
  } else {
    console.log('\n📝 Extracted Events Cache: not found')
    console.log('   💡 Run "node scripts/process-cached-posts.js" to extract events')
  }
  
  console.log('\n' + '='.repeat(70))
  console.log()
}

viewCache()
