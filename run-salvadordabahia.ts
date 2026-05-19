import 'dotenv/config'
import { runSalvadorDaBahiaScrape } from './src/salvadordabahia.js'

const result = await runSalvadorDaBahiaScrape({
  source: 'salvadordabahia' as any,
  city: 'salvador',
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
