import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkAllCategories() {
  console.log('🔍 Verificando todas as categorias no banco...\n')

  // Buscar todos os eventos
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, category, source')
    .order('start_datetime', { ascending: false })
    .limit(50)

  if (error) {
    console.error('❌ Erro ao buscar eventos:', error)
    process.exit(1)
  }

  if (!events || events.length === 0) {
    console.log('⚠️  Nenhum evento encontrado')
    process.exit(0)
  }

  console.log(`📊 Últimos 50 eventos:\n`)

  const categoryCount: Record<string, number> = {}
  const sourceCount: Record<string, number> = {}

  events.forEach((event, index) => {
    categoryCount[event.category || 'null'] = (categoryCount[event.category || 'null'] || 0) + 1
    sourceCount[event.source] = (sourceCount[event.source] || 0) + 1
    
    if (index < 20) {
      console.log(`${index + 1}. ${event.title}`)
      console.log(`   Categoria: ${event.category}`)
      console.log(`   Source: ${event.source}`)
      console.log()
    }
  })

  console.log('📈 Resumo por categoria:')
  Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`)
  })

  console.log('\n📈 Resumo por source:')
  Object.entries(sourceCount).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
    console.log(`   ${source}: ${count}`)
  })
}

checkAllCategories()
