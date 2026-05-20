import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Verificando tours no banco de dados...')
  console.log('Supabase URL:', supabaseUrl)
  console.log('')

  // Verificar tours
  const { data: tours, error: toursError } = await supabase
    .from('tours')
    .select('*')
    .eq('city', 'salvador')

  if (toursError) {
    console.error('Erro ao buscar tours:', toursError)
    return
  }

  console.log(`Tours encontrados: ${tours?.length || 0}`)
  
  if (tours && tours.length > 0) {
    console.log('\nTours:')
    tours.forEach(tour => {
      console.log(`- ID: ${tour.id}`)
      console.log(`  Title: ${tour.title}`)
      console.log(`  Curator: ${tour.curator_name}`)
      console.log(`  Published: ${tour.is_published}`)
      console.log(`  City: ${tour.city}`)
      console.log('')
    })

    // Verificar tour_stops
    for (const tour of tours) {
      const { data: stops, error: stopsError } = await supabase
        .from('tour_stops')
        .select('*')
        .eq('tour_id', tour.id)

      if (stopsError) {
        console.error(`Erro ao buscar stops para tour ${tour.id}:`, stopsError)
        continue
      }

      console.log(`Tour "${tour.title}" tem ${stops?.length || 0} stops`)
      if (stops && stops.length > 0) {
        stops.forEach(stop => {
          console.log(`  - Order: ${stop.order_index}, Event ID: ${stop.event_id}`)
        })
      }
      console.log('')
    }
  } else {
    console.log('Nenhum tour encontrado. Verificando se a tabela existe...')
    
    // Verificar se a tabela tours existe
    const { data: tables, error: tablesError } = await supabase
      .from('tours')
      .select('*')
      .limit(1)

    if (tablesError) {
      console.error('Erro ao acessar tabela tours:', tablesError)
      console.log('A tabela tours pode não existir ou não ter RLS configurado corretamente.')
    }
  }

  // Verificar se há eventos
  const { count: eventCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('city', 'salvador')

  console.log(`Total de eventos em Salvador: ${eventCount || 0}`)
}

main().catch(console.error)
