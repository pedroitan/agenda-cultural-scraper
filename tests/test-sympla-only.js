import 'dotenv/config'
import { runSymplaScrape } from '../dist/sympla.js'

console.log('\n🎵 Testing Sympla Scraper\n')
console.log('='.repeat(60))

try {
  const result = await runSymplaScrape({
    source: 'sympla',
    city: 'salvador',
    untilDays: 30,
  })

  console.log(`\n✅ Sympla OK!`)
  console.log(`   Fetched:  ${result.items_fetched}`)
  console.log(`   Valid:    ${result.valid.length}`)
  console.log(`   Invalid:  ${result.invalid_count}`)

  if (result.valid.length > 0) {
    console.log(`\n📋 Sample events:`)
    result.valid.slice(0, 3).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.title}`)
      console.log(`      📅 ${e.date}  ⏰ ${e.time}  📍 ${e.venue}`)
    })
  }
} catch (err) {
  console.error(`\n❌ Sympla FAILED:`, err.message)
  process.exit(1)
}

console.log('\n' + '='.repeat(60))
