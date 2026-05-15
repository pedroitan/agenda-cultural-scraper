import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpsert() {
  console.log('=== TESTE UPSERT SUPABASE RJ ===\n')

  const testEvent = {
    source: 'test',
    external_id: 'test-upsert-123',
    title: 'Evento de Teste Upsert',
    start_datetime: new Date().toISOString(),
    city: 'rio-de-janeiro',
    venue_name: 'Local de Teste',
    url: 'https://test.com',
    raw_payload: { test: true },
  }

  console.log('1. Tentando INSERT simples...')
  try {
    const { data, error } = await supabase
      .from('events')
      .insert(testEvent)
      .select()
      .single()

    if (error) {
      console.error('❌ INSERT falhou:', error)
      return
    }
    console.log('✅ INSERT sucesso:', data.id)
  } catch (err) {
    console.error('❌ INSERT exception:', err)
    return
  }

  console.log('\n2. Tentando UPSERT com onConflict...')
  try {
    const { data, error } = await supabase
      .from('events')
      .upsert(testEvent, {
        onConflict: 'source,external_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('❌ UPSERT falhou:', error)
      console.error('   Código:', error.code)
      console.error('   Mensagem:', error.message)
      console.error('   Detalhes:', error.details)
      console.error('   Hint:', error.hint)
      return
    }
    console.log('✅ UPSERT sucesso:', data.id)
  } catch (err) {
    console.error('❌ UPSERT exception:', err)
  }

  console.log('\n3. Verificando índices disponíveis...')
  try {
    // Query para verificar índices
    const { data: indexesData, error: indexesError } = await supabase
      .rpc('get_table_indexes', { table_name: 'events' })
    
    if (indexesError) {
      console.log('⚠️  RPC não disponível, tentando query direta...')
      
      // Query alternativa usando pg_indexes (se tiver acesso)
      const { data: pgIndexes, error: pgError } = await supabase
        .rpc('sql_exec', { 
          sql: 'SELECT indexname, indexdef FROM pg_indexes WHERE tablename = \'events\' AND schemaname = \'public\'' 
        })
      
      if (pgError) {
        console.log('⚠️  Não foi possível verificar índices via SQL direto')
        console.log('   Verifique manualmente no dashboard Supabase')
      } else {
        console.log('Índices:', pgIndexes)
      }
    } else {
      console.log('Índices encontrados:', indexesData)
    }
  } catch (err) {
    console.log('⚠️  Erro ao verificar índices:', err.message)
  }
}

testUpsert()
