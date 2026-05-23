import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkInstagramScrape() {
  console.log('🔍 Verificando últimos runs do Instagram scraper...\n')

  // Buscar últimos 10 runs do Instagram
  const { data: runs, error } = await supabase
    .from('scrape_runs')
    .select('*')
    .eq('source', 'instagram')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Erro ao buscar runs:', error)
    process.exit(1)
  }

  if (!runs || runs.length === 0) {
    console.log('⚠️  Nenhum run do Instagram encontrado')
    process.exit(0)
  }

  console.log(`📊 Últimos ${runs.length} runs do Instagram:\n`)

  runs.forEach((run, index) => {
    const status = run.status === 'completed' ? '✅' : '❌'
    const date = new Date(run.created_at).toLocaleString('pt-BR', { 
      timeZone: 'America/Bahia',
      dateStyle: 'short',
      timeStyle: 'short'
    })
    const duration = run.ended_at 
      ? `${Math.round((new Date(run.ended_at).getTime() - new Date(run.created_at).getTime()) / 1000)}s`
      : 'N/A'
    
    console.log(`${status} Run #${index + 1}:`)
    console.log(`   Data: ${date}`)
    console.log(`   Status: ${run.status}`)
    console.log(`   Duração: ${duration}`)
    console.log(`   Items fetched: ${run.items_fetched || 0}`)
    console.log(`   Items valid: ${run.items_valid || 0}`)
    console.log(`   Items upserted: ${run.items_upserted || 0}`)
    console.log(`   Error: ${run.error_message || 'N/A'}`)
    console.log()
  })

  // Verificar eventos mais recentes do Instagram
  console.log('📅 Últimos 5 eventos do Instagram no banco:\n')
  
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, start_datetime, created_at')
    .eq('source', 'instagram')
    .order('start_datetime', { ascending: false })
    .limit(5)

  if (eventsError) {
    console.error('❌ Erro ao buscar eventos:', eventsError)
  } else if (events && events.length > 0) {
    events.forEach((event, index) => {
      const date = new Date(event.start_datetime).toLocaleString('pt-BR', { 
        timeZone: 'America/Bahia',
        dateStyle: 'short',
        timeStyle: 'short'
      })
      const createdAt = new Date(event.created_at).toLocaleString('pt-BR', { 
        timeZone: 'America/Bahia',
        dateStyle: 'short',
        timeStyle: 'short'
      })
      console.log(`${index + 1}. ${event.title}`)
      console.log(`   Data do evento: ${date}`)
      console.log(`   Inserido em: ${createdAt}`)
      console.log()
    })
  } else {
    console.log('⚠️  Nenhum evento do Instagram encontrado')
  }
}

checkInstagramScrape()
