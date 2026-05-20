import 'dotenv/config'
import { supabase } from './src/supabase.js'

async function main() {
  const postUrl = 'https://www.instagram.com/p/DYVye27tHxg/'
  console.log(`========== Events from ${postUrl} ==========\n`)
  
  const { data: events } = await supabase
    .from('events')
    .select('id, title, image_url, start_datetime, url, raw_payload')
    .eq('source', 'instagram')
    .eq('url', postUrl)
    .order('start_datetime', { ascending: true })
  
  if (!events || events.length === 0) {
    console.log('❌ No events from this post!')
    
    // Try LIKE search
    const { data: similar } = await supabase
      .from('events')
      .select('id, title, url')
      .eq('source', 'instagram')
      .ilike('url', '%DYVye27tHxg%')
    
    console.log(`\nFound ${similar?.length || 0} via LIKE search`)
    similar?.forEach(e => console.log(`  - ${e.title} → ${e.url}`))
    return
  }
  
  console.log(`Found ${events.length} events from this post\n`)
  
  events.forEach((e, i) => {
    console.log(`${i + 1}. ${e.title}`)
    console.log(`   Image: ${e.image_url ? '✅' : '❌'} ${e.image_url?.substring(0, 80) || 'NULL'}`)
    console.log(`   Date: ${e.start_datetime}`)
    console.log()
  })
  
  // Also check ALL recent Instagram events
  console.log('\n========== Latest 10 Instagram events ==========\n')
  const { data: latest } = await supabase
    .from('events')
    .select('id, title, image_url, url, start_datetime, created_at')
    .eq('source', 'instagram')
    .order('created_at', { ascending: false })
    .limit(10)
  
  latest?.forEach((e, i) => {
    console.log(`${i + 1}. [${e.created_at?.substring(0, 19)}] ${e.title}`)
    console.log(`   Image: ${e.image_url ? '✅' : '❌'} ${e.image_url?.substring(0, 60) || 'NULL'}`)
    console.log(`   Post: ${e.url?.substring(0, 60)}`)
    console.log()
  })
}

main().catch(console.error)
