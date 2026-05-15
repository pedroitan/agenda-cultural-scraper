import 'dotenv/config'
import { supabase } from './src/supabase.js'

async function main() {
  console.log('========== Investigating El Cabong orphan events ==========\n')
  
  // Get all El Cabong events without images
  const { data: orphans } = await supabase
    .from('events')
    .select('id, title, start_datetime, image_url, url, is_active')
    .eq('source', 'elcabong')
    .is('image_url', null)
    .order('start_datetime', { ascending: true })
  
  if (!orphans || orphans.length === 0) {
    console.log('No orphan events!')
    return
  }
  
  console.log(`Found ${orphans.length} El Cabong events without images\n`)
  
  // Categorize by date
  const now = new Date()
  const past = orphans.filter(e => new Date(e.start_datetime) < now)
  const future = orphans.filter(e => new Date(e.start_datetime) >= now)
  
  console.log(`📅 Past events (already happened): ${past.length}`)
  console.log(`📅 Future events: ${future.length}`)
  
  console.log('\n=== Past events sample (first 5) ===')
  past.slice(0, 5).forEach((e, i) => {
    console.log(`${i + 1}. ${e.title.substring(0, 60)}`)
    console.log(`   Date: ${e.start_datetime}`)
    console.log(`   Active: ${e.is_active}`)
  })
  
  console.log('\n=== Future events sample (first 10) ===')
  future.slice(0, 10).forEach((e, i) => {
    console.log(`${i + 1}. ${e.title.substring(0, 60)}`)
    console.log(`   Date: ${e.start_datetime}`)
    console.log(`   URL: ${e.url}`)
  })
}

main().catch(console.error)
