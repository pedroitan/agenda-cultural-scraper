import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test1_writeToDatabase() {
  console.log('\n=== TESTE 1: Escrever no banco ===')
  try {
    const testEvent = {
      source: 'test',
      external_id: 'test-123',
      title: 'Evento de Teste RJ',
      start_datetime: new Date().toISOString(),
      city: 'rio-de-janeiro',
      venue_name: 'Local de Teste',
      url: 'https://test.com',
      raw_payload: { test: true },
    }

    const { data, error } = await supabase
      .from('events')
      .insert(testEvent)
      .select()
      .single()

    if (error) {
      console.error('❌ ERRO ao inserir:', error)
      return false
    }

    console.log('✅ SUCESSO: Evento inserido:', data)
    return true
  } catch (err) {
    console.error('❌ ERRO:', err)
    return false
  }
}

async function test2_fetchFromDatabase() {
  console.log('\n=== TESTE 2: Ler do banco ===')
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, city, source')
      .limit(5)

    if (error) {
      console.error('❌ ERRO ao buscar:', error)
      return false
    }

    console.log(`✅ SUCESSO: ${data.length} eventos encontrados`)
    console.log('Amostra:', data.slice(0, 3))
    return true
  } catch (err) {
    console.error('❌ ERRO:', err)
    return false
  }
}

async function test3_fetchSymplaPage() {
  console.log('\n=== TESTE 3: Buscar página Sympla RJ ===')
  try {
    const url = 'https://www.sympla.com.br/eventos/rio-de-janeiro-rj/show-musica-festa'
    console.log('Buscando:', url)

    const headers = {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'accept': 'text/html',
    }

    const res = await fetch(url, { headers })
    const html = await res.text()

    console.log(`✅ SUCESSO: ${html.length} caracteres recebidos`)
    console.log('Primeiros 200 chars:', html.substring(0, 200))

    // Contar ocorrências de "evento" no HTML
    const matches = html.toLowerCase().match(/evento/g)
    console.log(`Palavra "evento" encontrada ${matches?.length || 0} vezes`)

    return true
  } catch (err) {
    console.error('❌ ERRO:', err)
    return false
  }
}

async function main() {
  console.log('=== TESTES MINIMAIS SUPABASE RJ ===')
  console.log('URL:', supabaseUrl)

  const results = {
    write: await test1_writeToDatabase(),
    read: await test2_fetchFromDatabase(),
    fetch: await test3_fetchSymplaPage(),
  }

  console.log('\n=== RESUMO ===')
  console.log('Escrever no banco:', results.write ? '✅' : '❌')
  console.log('Ler do banco:', results.read ? '✅' : '❌')
  console.log('Buscar Sympla:', results.fetch ? '✅' : '❌')
}

main()
