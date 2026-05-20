import { runSymplaScrape } from './src/sympla.js'
import { runElCabongScrape } from './src/elcabong.js'

console.log('=== Testing Event Details Extraction ===\n')

// Test Sympla (first 2 events only for speed)
console.log('--- Sympla ---')
try {
  const symplaResult = await runSymplaScrape({ source: 'sympla', city: 'salvador' })
  console.log(`Total events: ${symplaResult.items_fetched}`)
  console.log(`Valid: ${symplaResult.valid.length}`)
  console.log(`Invalid: ${symplaResult.invalid_count}`)
  
  // Show first 5 events with detail fields
  console.log('\nFirst 5 events with details:')
  symplaResult.valid.slice(0, 5).forEach((ev, i) => {
    console.log(`\n${i + 1}. ${ev.title}`)
    console.log(`   Description: ${ev.description?.slice(0, 80) || 'NOT FOUND'}...`)
    console.log(`   Performers: ${ev.performers || 'NOT FOUND'}`)
    console.log(`   Duration: ${ev.duration || 'NOT FOUND'}`)
    console.log(`   Age restriction: ${ev.age_restriction || 'NOT FOUND'}`)
    console.log(`   Organizer: ${ev.organizer || 'NOT FOUND'}`)
  })
  
  // Count events with each field
  const withDesc = symplaResult.valid.filter(e => e.description).length
  const withPerf = symplaResult.valid.filter(e => e.performers).length
  const withDur = symplaResult.valid.filter(e => e.duration).length
  const withAge = symplaResult.valid.filter(e => e.age_restriction).length
  const withOrg = symplaResult.valid.filter(e => e.organizer).length
  
  console.log(`\nField coverage (out of ${symplaResult.valid.length}):`)
  console.log(`  Description: ${withDesc} (${(withDesc/symplaResult.valid.length*100).toFixed(1)}%)`)
  console.log(`  Performers: ${withPerf} (${(withPerf/symplaResult.valid.length*100).toFixed(1)}%)`)
  console.log(`  Duration: ${withDur} (${(withDur/symplaResult.valid.length*100).toFixed(1)}%)`)
  console.log(`  Age restriction: ${withAge} (${(withAge/symplaResult.valid.length*100).toFixed(1)}%)`)
  console.log(`  Organizer: ${withOrg} (${(withOrg/symplaResult.valid.length*100).toFixed(1)}%)`)
  
} catch (err) {
  console.error('Sympla error:', err)
}

console.log('\n' + '='.repeat(50) + '\n')

// Test El Cabong (first 2 events only for speed)
console.log('--- El Cabong ---')
try {
  const elcabongResult = await runElCabongScrape({ source: 'elcabong', city: 'salvador' })
  console.log(`Total events: ${elcabongResult.items_fetched}`)
  console.log(`Valid: ${elcabongResult.valid.length}`)
  console.log(`Invalid: ${elcabongResult.invalid_count}`)
  
  // Show first 5 events with detail fields
  console.log('\nFirst 5 events with details:')
  elcabongResult.valid.slice(0, 5).forEach((ev, i) => {
    console.log(`\n${i + 1}. ${ev.title}`)
    console.log(`   Description: ${ev.description?.slice(0, 80) || 'NOT FOUND'}...`)
    console.log(`   Performers: ${ev.performers || 'NOT FOUND'}`)
    console.log(`   Duration: ${ev.duration || 'NOT FOUND'}`)
    console.log(`   Age restriction: ${ev.age_restriction || 'NOT FOUND'}`)
    console.log(`   Organizer: ${ev.organizer || 'NOT FOUND'}`)
  })
  
  // Count events with each field
  const withDesc = elcabongResult.valid.filter(e => e.description).length
  const withPerf = elcabongResult.valid.filter(e => e.performers).length
  const withDur = elcabongResult.valid.filter(e => e.duration).length
  const withAge = elcabongResult.valid.filter(e => e.age_restriction).length
  const withOrg = elcabongResult.valid.filter(e => e.organizer).length
  
  console.log(`\nField coverage (out of ${elcabongResult.valid.length}):`)
  console.log(`  Description: ${withDesc} (${(withDesc/elcabongResult.valid.length*100).toFixed(1)}%)`)
  console.log(`  Performers: ${withPerf} (${(withPerf/elcabongResult.valid.length*100).toFixed(1)}%)`)
  console.log(`  Duration: ${withDur} (${(withDur/elcabongResult.valid.length*100).toFixed(1)}%)`)
  console.log(`  Age restriction: ${withAge} (${(withAge/elcabongResult.valid.length*100).toFixed(1)}%)`)
  console.log(`  Organizer: ${withOrg} (${(withOrg/elcabongResult.valid.length*100).toFixed(1)}%)`)
  
} catch (err) {
  console.error('El Cabong error:', err)
}

console.log('\n=== Test Complete ===')
