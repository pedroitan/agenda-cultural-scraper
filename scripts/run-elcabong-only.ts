import 'dotenv/config'
import { runElCabongScrape } from './src/elcabong.js'
import { supabase } from './src/supabase.js'

async function main() {
  console.log('========== Running El Cabong scraper with UPSERT ==========')
  
  const result = await runElCabongScrape({
    city: 'salvador',
    source: 'elcabong',
  })
  
  console.log(`\n📊 Scraped ${result.valid.length} valid events`)
  
  // Count events with images
  const withImages = result.valid.filter(ev => ev.image_url).length
  console.log(`📊 Events with images: ${withImages}/${result.valid.length}`)
  
  // Manual UPSERT: fetch existing → UPDATE existing + INSERT new
  console.log('\n🔄 Fetching existing El Cabong events...')
  const externalIds = result.valid.map(e => e.external_id).filter(Boolean) as string[]
  const { data: existing } = await supabase
    .from('events')
    .select('id, external_id')
    .eq('source', 'elcabong')
    .in('external_id', externalIds)
  
  const existingMap = new Map((existing || []).map(e => [e.external_id, e.id]))
  console.log(`   Found ${existingMap.size} existing events to update`)
  
  // UPDATE existing events
  let updated = 0
  for (const ev of result.valid) {
    if (!ev.external_id) continue
    const existingId = existingMap.get(ev.external_id)
    if (existingId) {
      const { error: updateErr } = await supabase
        .from('events')
        .update({
          title: ev.title,
          start_datetime: ev.start_datetime,
          venue_name: ev.venue_name,
          image_url: ev.image_url,
          url: ev.url,
          category: ev.category,
        })
        .eq('id', existingId)
      
      if (updateErr) {
        console.error(`❌ Update error for ${ev.title}:`, updateErr.message)
      } else {
        updated++
      }
    }
  }
  console.log(`   ✅ Updated ${updated} events`)
  
  // INSERT new events
  const newEvents = result.valid.filter(ev => !existingMap.has(ev.external_id || ''))
  console.log(`   📥 Inserting ${newEvents.length} new events...`)
  if (newEvents.length > 0) {
    const { error: insertErr } = await supabase.from('events').insert(newEvents)
    if (insertErr) {
      console.error('❌ Insert error:', insertErr.message)
    } else {
      console.log(`   ✅ Inserted ${newEvents.length} new events`)
    }
  }
  
  // Verify in DB
  const { count: totalCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'elcabong')
  
  const { count: withImagesCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'elcabong')
    .not('image_url', 'is', null)
  
  console.log(`\n📊 Final DB state:`)
  console.log(`   Total El Cabong events: ${totalCount}`)
  console.log(`   With images: ${withImagesCount}`)
  console.log(`   Without images: ${(totalCount || 0) - (withImagesCount || 0)}`)
}

main().catch(console.error)
