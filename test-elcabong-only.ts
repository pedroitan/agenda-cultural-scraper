import { runElCabongScrape } from './src/elcabong.js'

async function main() {
  console.log('========== El Cabong Only Scraper ==========')
  
  const result = await runElCabongScrape({
    city: 'salvador',
    source: 'elcabong',
  })
  
  console.log('\n========== Results ==========')
  console.log(`Valid events: ${result.valid.length}`)
  console.log(`Invalid events: ${result.invalid_count}`)
  console.log(`Total fetched: ${result.items_fetched}`)
  
  console.log('\n========== Sample Events ==========')
  result.valid.slice(0, 5).forEach((ev, i) => {
    console.log(`\n${i + 1}. ${ev.title}`)
    console.log(`   Image URL: ${ev.image_url || 'NO IMAGE'}`)
    console.log(`   Location: ${ev.venue_name}`)
    console.log(`   Date: ${ev.start_datetime}`)
  })
  
  // Count events with images
  const eventsWithImages = result.valid.filter(ev => ev.image_url).length
  console.log(`\n========== Image Stats ==========`)
  console.log(`Events with images: ${eventsWithImages}/${result.valid.length}`)
  console.log(`Events without images: ${result.valid.length - eventsWithImages}/${result.valid.length}`)
}

main().catch(console.error)
