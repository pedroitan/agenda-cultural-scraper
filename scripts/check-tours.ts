import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkTours() {
  console.log('🔍 Verificando roteiros...\n')

  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Erro ao buscar roteiros:', error)
    process.exit(1)
  }

  if (!tours || tours.length === 0) {
    console.log('⚠️  Nenhum roteiro encontrado')
    process.exit(0)
  }

  console.log(`📊 ${tours.length} roteiro(s) encontrado(s):\n`)

  tours.forEach((tour, index) => {
    console.log(`${index + 1}. ${tour.title}`)
    console.log(`   ID: ${tour.id}`)
    console.log(`   Curador: ${tour.curator_name}`)
    console.log(`   Descrição: ${tour.description?.substring(0, 100) || 'N/A'}...`)
    console.log()
  })
}

checkTours()
