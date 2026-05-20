import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function validateElCabongDetails() {
  const { data: events, error } = await supabase
    .from('events')
    .select('source, description, performers, duration, age_restriction, organizer, title')
    .eq('source', 'elcabong')
    .limit(10)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('=== El Cabong Events Detail Validation ===\n')
  
  let withDescription = 0
  let withPerformers = 0
  let withDuration = 0
  let withAgeRestriction = 0
  let withOrganizer = 0

  events.forEach((ev, i) => {
    if (ev.description) withDescription++
    if (ev.performers) withPerformers++
    if (ev.duration) withDuration++
    if (ev.age_restriction) withAgeRestriction++
    if (ev.organizer) withOrganizer++

    console.log(`${i + 1}. ${ev.title.slice(0, 50)}`)
    console.log(`   Description: ${ev.description ? '✓' : '✗'} (${ev.description?.slice(0, 80) || 'empty'})`)
    console.log(`   Performers: ${ev.performers ? '✓' : '✗'} (${ev.performers || 'empty'})`)
    console.log(`   Duration: ${ev.duration ? '✓' : '✗'} (${ev.duration || 'empty'})`)
    console.log(`   Age restriction: ${ev.age_restriction ? '✓' : '✗'} (${ev.age_restriction || 'empty'})`)
    console.log(`   Organizer: ${ev.organizer ? '✓' : '✗'} (${ev.organizer || 'empty'})`)
    console.log()
  })

  console.log('=== Coverage ===')
  console.log(`Description: ${withDescription}/${events.length} (${(withDescription/events.length*100).toFixed(1)}%)`)
  console.log(`Performers: ${withPerformers}/${events.length} (${(withPerformers/events.length*100).toFixed(1)}%)`)
  console.log(`Duration: ${withDuration}/${events.length} (${(withDuration/events.length*100).toFixed(1)}%)`)
  console.log(`Age restriction: ${withAgeRestriction}/${events.length} (${(withAgeRestriction/events.length*100).toFixed(1)}%)`)
  console.log(`Organizer: ${withOrganizer}/${events.length} (${(withOrganizer/events.length*100).toFixed(1)}%)`)
}

validateElCabongDetails()
