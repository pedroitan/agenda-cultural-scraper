import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkInstagramCategories() {
  console.log('🔍 Verificando categorias de eventos do Instagram...\n')

  // Buscar eventos do Instagram
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, category, start_datetime')
    .eq('source', 'instagram')
    .order('start_datetime', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Erro ao buscar eventos:', error)
    process.exit(1)
  }

  if (!events || events.length === 0) {
    console.log('⚠️  Nenhum evento do Instagram encontrado')
    process.exit(0)
  }

  console.log(`📊 Últimos 20 eventos do Instagram:\n`)

  const categoryCount: Record<string, number> = {}

  events.forEach((event, index) => {
    const date = new Date(event.start_datetime).toLocaleString('pt-BR', { 
      timeZone: 'America/Bahia',
      dateStyle: 'short',
      timeStyle: 'short'
    })
    
    categoryCount[event.category] = (categoryCount[event.category] || 0) + 1
    
    console.log(`${index + 1}. ${event.title}`)
    console.log(`   Categoria: ${event.category}`)
    console.log(`   Data: ${date}`)
    console.log()
  })

  console.log('📈 Resumo por categoria:')
  Object.entries(categoryCount).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`)
  })
}

checkInstagramCategories()
