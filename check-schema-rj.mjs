import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
})

async function checkSchema() {
  console.log('=== VERIFICANDO SCHEMA SUPABASE RJ ===\n')

  // 1. Verificar colunas da tabela events
  console.log('--- COLUNAS DA TABELA events ---')
  const { data: columns, error: columnsError } = await supabase
    .rpc('get_table_columns', { table_name: 'events' })
    .catch(() => ({ data: null, error: { message: 'RPC not available' } }))

  if (columnsError) {
    // Fallback: usar query direta
    const { data: fallbackData } = await supabase
      .from('events')
      .select('*')
      .limit(1)
    
    if (fallbackData && fallbackData.length > 0) {
      console.log('Colunas encontradas:', Object.keys(fallbackData[0]).join(', '))
    }
  } else {
    console.log('Colunas:', columns?.map(c => c.column_name).join(', '))
  }

  // 2. Verificar índices da tabela events
  console.log('\n--- ÍNDICES DA TABELA events ---')
  const { data: indexes, error: indexesError } = await supabase
    .rpc('get_table_indexes', { table_name: 'events' })
    .catch(() => ({ data: null, error: { message: 'RPC not available' } }))

  if (indexesError) {
    console.log('⚠️  Não foi possível verificar índices (RPC não disponível)')
    console.log('   Verifique manualmente no Supabase: Table Editor → events → Indexes')
  } else {
    console.log('Índices:', indexes?.map(i => i.indexname).join(', '))
  }

  // 3. Verificar colunas da tabela scrape_runs
  console.log('\n--- COLUNAS DA TABELA scrape_runs ---')
  const { data: scrapeColumns } = await supabase
    .from('scrape_runs')
    .select('*')
    .limit(1)
  
  if (scrapeColumns && scrapeColumns.length > 0) {
    console.log('Colunas:', Object.keys(scrapeColumns[0]).join(', '))
  } else {
    console.log('⚠️  Tabela scrape_runs vazia ou inacessível')
  }

  console.log('\n=== VERIFICAÇÃO MANUAL ===')
  console.log('Acesse: https://supabase.com/dashboard/project/wudxuqqnjnfjhwaztrap/database/tables')
  console.log('Verifique se existe o índice: idx_events_external_id')
}

checkSchema()
