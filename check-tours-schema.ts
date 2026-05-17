import 'dotenv/config'
import { supabase } from './src/supabase.js'

async function main() {
  // Create a test tour first
  const { data: tour } = await supabase
    .from('tours')
    .insert({ title: 'test_schema_check', city: 'salvador' })
    .select()
    .single()
  
  if (!tour) return console.log('Failed to create tour')
  
  // Try inserting tour_stops with various fields
  const { data: stops, error } = await supabase
    .from('tour_stops')
    .insert({
      tour_id: tour.id,
      order_index: 1,
      title: 'test stop',
    })
    .select()
    .single()
  console.log('tour_stops error:', error?.message)
  console.log('tour_stops columns:', stops ? Object.keys(stops) : 'failed')
  if (stops) console.log('Sample:', JSON.stringify(stops, null, 2))
  
  // Cleanup
  await supabase.from('tour_stops').delete().eq('tour_id', tour.id)
  await supabase.from('tours').delete().eq('id', tour.id)
}

main().catch(console.error)
