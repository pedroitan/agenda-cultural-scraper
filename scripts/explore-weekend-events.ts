import 'dotenv/config'
import { supabase } from './src/supabase.js'

async function main() {
  console.log('========== Weekend events for Salvador ==========\n')
  
  // Today is Friday May 15. Weekend = May 16 (Sat) and 17 (Sun)
  const friday = new Date('2026-05-15T18:00:00')
  const monday = new Date('2026-05-18T06:00:00')
  
  const { data: events } = await supabase
    .from('events')
    .select('id, title, source, venue_name, category, start_datetime, image_url, is_free, price_text')
    .gte('start_datetime', friday.toISOString())
    .lt('start_datetime', monday.toISOString())
    .eq('city', 'salvador')
    .eq('is_active', true)
    .order('start_datetime', { ascending: true })
  
  if (!events) return
  
  console.log(`Total weekend events: ${events.length}\n`)
  
  // Group by day
  const byDay: Record<string, typeof events> = {}
  for (const ev of events) {
    const day = ev.start_datetime.substring(0, 10)
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(ev)
  }
  
  for (const [day, dayEvents] of Object.entries(byDay)) {
    console.log(`\n=== ${day} (${dayEvents.length} events) ===`)
    
    // Group by category
    const byCategory: Record<string, number> = {}
    for (const ev of dayEvents) {
      const cat = ev.category || 'Sem categoria'
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }
    console.log('Categories:', Object.entries(byCategory).map(([c, n]) => `${c}(${n})`).join(', '))
    
    // Group by venue (top 10)
    const byVenue: Record<string, number> = {}
    for (const ev of dayEvents) {
      const venue = ev.venue_name || 'Sem local'
      byVenue[venue] = (byVenue[venue] || 0) + 1
    }
    const topVenues = Object.entries(byVenue).sort((a, b) => b[1] - a[1]).slice(0, 8)
    console.log('Top venues:', topVenues.map(([v, n]) => `${v}(${n})`).join(', '))
  }
  
  // Sample some interesting events
  console.log('\n=== Sample interesting events ===')
  
  // Cultural/teatro events
  const cultural = events.filter(e => 
    e.category?.toLowerCase().includes('teatro') ||
    e.category?.toLowerCase().includes('arte') ||
    e.category?.toLowerCase().includes('cultura')
  ).slice(0, 5)
  console.log('\n--- Cultural/Teatro ---')
  cultural.forEach(e => console.log(`  ${e.start_datetime.substring(0, 16)} - ${e.title.substring(0, 50)} @ ${e.venue_name || 'N/A'}`))
  
  // Free events
  const free = events.filter(e => e.is_free).slice(0, 8)
  console.log('\n--- Free events ---')
  free.forEach(e => console.log(`  ${e.start_datetime.substring(0, 16)} - ${e.title.substring(0, 50)} @ ${e.venue_name || 'N/A'}`))
  
  // Music shows (festas/shows)
  const shows = events.filter(e => 
    e.category?.toLowerCase().includes('show') ||
    e.category?.toLowerCase().includes('festa') ||
    e.category?.toLowerCase().includes('música')
  ).slice(0, 10)
  console.log('\n--- Shows/Festas ---')
  shows.forEach(e => console.log(`  ${e.start_datetime.substring(0, 16)} - ${e.title.substring(0, 50)} @ ${e.venue_name || 'N/A'}`))
  
  // Daytime events (good for family)
  const daytime = events.filter(e => {
    const hour = parseInt(e.start_datetime.substring(11, 13))
    return hour >= 9 && hour <= 17
  }).slice(0, 10)
  console.log('\n--- Daytime events (9h-17h) ---')
  daytime.forEach(e => console.log(`  ${e.start_datetime.substring(0, 16)} - ${e.title.substring(0, 50)} @ ${e.venue_name || 'N/A'}`))
}

main().catch(console.error)
