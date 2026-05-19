import 'dotenv/config'
import { runSalvadorDaBahiaScrape } from './src/salvadordabahia.js'

const untilDays = process.env.SCRAPE_UNTIL_DAYS ? parseInt(process.env.SCRAPE_UNTIL_DAYS) : 60

const result = await runSalvadorDaBahiaScrape({
  source: 'salvadordabahia' as any,
  city: 'salvador',
  untilDays,
})

console.log('\n====== RESULTADO ======')
console.log(`Buscados: ${result.items_fetched}`)
console.log(`Válidos:  ${result.valid.length}`)
console.log(`Inválidos: ${result.invalid_count}`)
console.log('\nAmostra de eventos válidos:')
result.valid.slice(0, 5).forEach(e => {
  console.log(`- ${e.title}`)
  console.log(`  Data: ${e.start_datetime}`)
  console.log(`  Venue: ${e.venue_name || 'N/A'}`)
  console.log(`  Preço: ${e.price_text || (e.is_free ? 'Gratuito' : 'N/A')}`)
  console.log(`  URL: ${e.url}`)
})
