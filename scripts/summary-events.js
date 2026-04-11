import fs from 'fs'
import path from 'path'

/**
 * Resumo executivo dos eventos por data
 */

function summaryEvents() {
  const eventsFile = path.join(process.cwd(), 'cache', 'extracted-events.json')
  
  if (!fs.existsSync(eventsFile)) {
    console.error('❌ Events cache not found!')
    process.exit(1)
  }
  
  const data = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'))
  
  console.log('\n📊 RESUMO EXECUTIVO - EVENTOS EXTRAÍDOS\n')
  console.log('='.repeat(70))
  
  console.log(`\n📅 Período: ${data.eventsByDate.length} datas diferentes`)
  console.log(`📝 Total de eventos: ${data.totalEvents}`)
  console.log(`💰 Eventos gratuitos: ${data.stats.free} (${Math.round(data.stats.free / data.totalEvents * 100)}%)`)
  console.log(`💵 Eventos pagos: ${data.stats.paid} (${Math.round(data.stats.paid / data.totalEvents * 100)}%)`)
  
  // Agrupar por mês
  const byMonth = {}
  data.eventsByDate.forEach(({ date, count }) => {
    const monthKey = date.substring(0, 7) // YYYY-MM
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = { count: 0, dates: 0 }
    }
    byMonth[monthKey].count += count
    byMonth[monthKey].dates += 1
  })
  
  console.log('\n📆 Eventos por Mês:')
  Object.keys(byMonth).sort().forEach(month => {
    const [year, monthNum] = month.split('-')
    const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    console.log(`   ${monthName}: ${byMonth[month].count} eventos em ${byMonth[month].dates} dias`)
  })
  
  // Top 5 datas com mais eventos
  console.log('\n🏆 Top 5 Datas com Mais Eventos:')
  const sortedByCount = [...data.eventsByDate].sort((a, b) => b.count - a.count).slice(0, 5)
  sortedByCount.forEach(({ date, count }, i) => {
    const dateObj = new Date(date)
    const dateStr = dateObj.toLocaleDateString('pt-BR', { 
      weekday: 'long',
      day: '2-digit', 
      month: 'long'
    })
    console.log(`   ${i + 1}. ${dateStr}: ${count} eventos`)
  })
  
  // Estatísticas de horários
  const timeStats = {}
  data.events.forEach(event => {
    const hour = event.time.split(':')[0]
    if (!timeStats[hour]) timeStats[hour] = 0
    timeStats[hour]++
  })
  
  console.log('\n⏰ Horários Mais Populares:')
  const topTimes = Object.entries(timeStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  topTimes.forEach(([hour, count], i) => {
    console.log(`   ${i + 1}. ${hour}h: ${count} eventos`)
  })
  
  // Locais mais frequentes
  const venueStats = {}
  data.events.forEach(event => {
    const venue = event.venue
    if (!venueStats[venue]) venueStats[venue] = 0
    venueStats[venue]++
  })
  
  console.log('\n📍 Top 10 Locais Mais Frequentes:')
  const topVenues = Object.entries(venueStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  topVenues.forEach(([venue, count], i) => {
    console.log(`   ${i + 1}. ${venue}: ${count} eventos`)
  })
  
  console.log('\n' + '='.repeat(70))
  console.log()
}

summaryEvents()
