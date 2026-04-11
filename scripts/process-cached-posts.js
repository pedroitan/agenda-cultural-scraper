import 'dotenv/config'
import { TextProcessor } from '../dist/scrapers/instagram-apify/text-processor.js'
import { EventAggregator } from '../dist/scrapers/instagram-apify/event-aggregator.js'
import fs from 'fs'
import path from 'path'

/**
 * Script para processar posts do cache local e extrair eventos
 * Uso: node scripts/process-cached-posts.js
 * 
 * Não usa Apify - processa posts já salvos em cache
 * Pode rodar múltiplas vezes sem custo adicional
 */

async function processCachedPosts() {
  console.log('\n📝 Processing Cached Instagram Posts\n')
  console.log('='.repeat(70))
  
  // Ler cache
  const cacheFile = path.join(process.cwd(), 'cache', 'instagram-posts.json')
  
  if (!fs.existsSync(cacheFile)) {
    console.error('❌ Cache file not found!')
    console.log('\n💡 Run "node scripts/fetch-instagram-posts.js" first to fetch posts')
    process.exit(1)
  }
  
  const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'))
  
  console.log(`\n📦 Cache info:`)
  console.log(`   Fetched at: ${new Date(cacheData.fetchedAt).toLocaleString('pt-BR')}`)
  console.log(`   Username: @${cacheData.username}`)
  console.log(`   Posts in cache: ${cacheData.postsCount}`)
  
  // Processar posts
  console.log(`\n🔄 Processing posts...`)
  const startTime = Date.now()
  
  const processor = new TextProcessor()
  const aggregator = new EventAggregator()
  
  let allEvents = []
  let postsWithEvents = 0
  
  for (const post of cacheData.posts) {
    const events = await processor.extractEvents(post.caption, post.url, post.timestamp)
    
    if (events.length > 0) {
      postsWithEvents++
      allEvents.push(...events)
      
      // Extrair data do caption para mostrar
      const dateMatch = post.caption.match(/♫\s*Agenda\s+de\s+#[^\s,]+,\s+(\d+)\s+de\s+([^\s♫]+)/i)
      const dateStr = dateMatch ? `${dateMatch[1]} de ${dateMatch[2]}` : 'data não identificada'
      
      console.log(`   ✅ Post ${post.id.substring(0, 10)}... (${dateStr}): ${events.length} eventos`)
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  
  // Deduplicate e agregar
  const uniqueEvents = aggregator.deduplicate(allEvents)
  const stats = aggregator.getStats(uniqueEvents)
  
  console.log(`\n✅ Processing completed in ${duration}s`)
  
  console.log(`\n📊 Results:`)
  console.log(`   Posts processed: ${cacheData.postsCount}`)
  console.log(`   Posts with events: ${postsWithEvents}`)
  console.log(`   Total events extracted: ${allEvents.length}`)
  console.log(`   Unique events (after dedup): ${uniqueEvents.length}`)
  console.log(`   Free events: ${stats.free}`)
  console.log(`   Paid events: ${stats.paid}`)
  
  // Agrupar por data
  const eventsByDate = {}
  uniqueEvents.forEach(event => {
    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = []
    }
    eventsByDate[event.date].push(event)
  })
  
  console.log(`\n📅 Events by date:`)
  Object.keys(eventsByDate).sort().forEach(date => {
    const count = eventsByDate[date].length
    const dateObj = new Date(date)
    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })
    console.log(`   ${date} (${dayName}): ${count} eventos`)
  })
  
  // Salvar eventos extraídos
  const eventsFile = path.join(process.cwd(), 'cache', 'extracted-events.json')
  const eventsData = {
    processedAt: new Date().toISOString(),
    sourceCache: cacheData.fetchedAt,
    totalEvents: uniqueEvents.length,
    stats,
    eventsByDate: Object.keys(eventsByDate).sort().map(date => ({
      date,
      count: eventsByDate[date].length,
      events: eventsByDate[date]
    })),
    events: uniqueEvents
  }
  
  fs.writeFileSync(eventsFile, JSON.stringify(eventsData, null, 2))
  
  console.log(`\n💾 Events saved:`)
  console.log(`   File: ${eventsFile}`)
  console.log(`   Size: ${(fs.statSync(eventsFile).size / 1024).toFixed(1)} KB`)
  
  console.log(`\n✅ Done! Events extracted and saved.`)
  console.log(`\n💡 You can run this script multiple times without using Apify credits!`)
  console.log('='.repeat(70))
  console.log()
}

processCachedPosts().catch(error => {
  console.error('\n❌ Error:', error.message)
  console.error(error.stack)
  process.exit(1)
})
