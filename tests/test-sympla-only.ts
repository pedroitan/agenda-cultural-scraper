import { runSymplaScrape } from './src/sympla.js'

console.log('=== Sympla Event Details Extraction ===\n')

try {
  const result = await runSymplaScrape({ source: 'sympla', city: 'salvador' })
  console.log(`Total events: ${result.items_fetched}`)
  console.log(`Valid: ${result.valid.length}`)
  console.log(`Invalid: ${result.invalid_count}`)
  
  // Show first 5 events with detail fields
  console.log('\nFirst 5 events with details:')
  result.valid.slice(0, 5).forEach((ev, i) => {
    console.log(`\n${i + 1}. ${ev.title}`)
    console.log(`   Description: ${ev.description?.slice(0, 80) || 'NOT FOUND'}...`)
    console.log(`   Performers: ${ev.performers || 'NOT FOUND'}`)
    console.log(`   Duration: ${ev.duration || 'NOT FOUND'}`)
    console.log(`   Age restriction: ${ev.age_restriction || 'NOT FOUND'}`)
    console.log(`   Organizer: ${ev.organizer || 'NOT FOUND'}`)
  })
  
  // Count events with each field
  const withDesc = result.valid.filter(e => e.description).length
  const withPerf = result.valid.filter(e => e.performers).length
  const withDur = result.valid.filter(e => e.duration).length
  const withAge = result.valid.filter(e => e.age_restriction).length
  const withOrg = result.valid.filter(e => e.organizer).length
  
  console.log(`\nField coverage (out of ${result.valid.length}):`)
  console.log(`  Description: ${withDesc} (${(withDesc/result.valid.length*100).toFixed(1)}%)`)
  console.log(`  Performers: ${withPerf} (${(withPerf/result.valid.length*100).toFixed(1)}%)`)
  console.log(`  Duration: ${withDur} (${(withDur/result.valid.length*100).toFixed(1)}%)`)
  console.log(`  Age restriction: ${withAge} (${(withAge/result.valid.length*100).toFixed(1)}%)`)
  console.log(`  Organizer: ${withOrg} (${(withOrg/result.valid.length*100).toFixed(1)}%)`)
  
} catch (err) {
  console.error('Error:', err)
}

console.log('\n=== Test Complete ===')
