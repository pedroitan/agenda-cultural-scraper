import 'dotenv/config'
import { supabase } from './src/supabase.js'

async function main() {
  console.log('========== Investigating Instagram event images ==========\n')
  
  const { data: events } = await supabase
    .from('events')
    .select('id, title, image_url, url, start_datetime, raw_payload')
    .eq('source', 'instagram')
    .gte('start_datetime', new Date().toISOString())
    .order('start_datetime', { ascending: true })
  
  if (!events || events.length === 0) {
    console.log('No future Instagram events!')
    return
  }
  
  console.log(`Total future Instagram events: ${events.length}\n`)
  
  const withImages = events.filter(e => e.image_url)
  const withoutImages = events.filter(e => !e.image_url)
  
  console.log(`📷 With images: ${withImages.length}`)
  console.log(`❌ Without images: ${withoutImages.length}`)
  
  console.log('\n=== Sample event WITH image ===')
  if (withImages.length > 0) {
    const ev = withImages[0]
    console.log(`Title: ${ev.title}`)
    console.log(`Image URL: ${ev.image_url}`)
    console.log(`URL: ${ev.url}`)
    
    // Test if URL is still accessible
    try {
      const resp = await fetch(ev.image_url, { method: 'HEAD' })
      console.log(`Image accessible: ${resp.ok ? '✅ YES' : '❌ NO'} (${resp.status})`)
    } catch (e) {
      console.log(`Image accessible: ❌ Error - ${e}`)
    }
  }
  
  console.log('\n=== Sample event WITHOUT image ===')
  if (withoutImages.length > 0) {
    const ev = withoutImages[0]
    console.log(`Title: ${ev.title}`)
    console.log(`URL: ${ev.url}`)
    console.log(`Raw payload imageUrl: ${ev.raw_payload?.imageUrl || 'N/A'}`)
  }
}

main().catch(console.error)
