import fs from 'fs'
import path from 'path'

/**
 * Lista todos os eventos encontrados organizados por data
 */

function listEventsByDate() {
  const eventsFile = path.join(process.cwd(), 'cache', 'extracted-events.json')
  
  if (!fs.existsSync(eventsFile)) {
    console.error('❌ Events cache not found!')
    console.log('\n💡 Run "node scripts/process-cached-posts.js" first')
    process.exit(1)
  }
  
  const data = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'))
  
  console.log('\n📅 Todos os Eventos por Data\n')
  console.log('='.repeat(70))
  console.log(`\nProcessado em: ${new Date(data.processedAt).toLocaleString('pt-BR')}`)
  console.log(`Total de eventos: ${data.totalEvents}`)
  console.log(`Eventos gratuitos: ${data.stats.free}`)
  console.log(`Eventos pagos: ${data.stats.paid}`)
  console.log('\n' + '='.repeat(70))
  
  // Ordenar por data
  const sortedDates = data.eventsByDate.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  sortedDates.forEach(({ date, count, events }) => {
    const dateObj = new Date(date)
    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })
    const dateStr = dateObj.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    })
    
    console.log(`\n📆 ${dateStr.toUpperCase()} (${dayName})`)
    console.log(`   ${count} eventos`)
    console.log('   ' + '-'.repeat(66))
    
    events.forEach((event, i) => {
      console.log(`\n   ${i + 1}. ${event.title}`)
      console.log(`      📍 ${event.venue}`)
      console.log(`      ⏰ ${event.time}`)
      console.log(`      💰 ${event.price}`)
    })
    
    console.log('\n' + '='.repeat(70))
  })
  
  console.log(`\n✅ Total: ${data.totalEvents} eventos em ${sortedDates.length} datas diferentes\n`)
}

listEventsByDate()
