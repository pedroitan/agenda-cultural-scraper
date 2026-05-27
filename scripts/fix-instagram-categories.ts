import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

/**
 * Extrai categoria do título do evento
 * Para Instagram Agenda Alternativa, assume Shows/Festas como padrão
 */
function extractCategory(title: string): string {
  const lowerTitle = title.toLowerCase()

  // Palavras-chave para Shows
  if (lowerTitle.includes('show') || 
      lowerTitle.includes('música') || 
      lowerTitle.includes('concerto') ||
      lowerTitle.includes('dj') ||
      lowerTitle.includes('sound system') ||
      lowerTitle.includes('riddim') ||
      lowerTitle.includes('reggae') ||
      lowerTitle.includes('samba') ||
      lowerTitle.includes('forró') ||
      lowerTitle.includes('axé') ||
      lowerTitle.includes('rock') ||
      lowerTitle.includes('pop') ||
      lowerTitle.includes('jazz') ||
      lowerTitle.includes('blues') ||
      lowerTitle.includes('eletrônica') ||
      lowerTitle.includes('funk') ||
      lowerTitle.includes('hip hop') ||
      lowerTitle.includes('rap') ||
      lowerTitle.includes('baile') ||
      lowerTitle.includes('sessão') ||
      lowerTitle.includes('live') ||
      lowerTitle.includes('ao vivo')) {
    return 'Shows'
  }

  // Palavras-chave para Festas
  if (lowerTitle.includes('festa') || 
      lowerTitle.includes('balada') ||
      lowerTitle.includes('party') ||
      lowerTitle.includes('night') ||
      lowerTitle.includes('clube') ||
      lowerTitle.includes('quinta') ||
      lowerTitle.includes('sexta') ||
      lowerTitle.includes('sábado') ||
      lowerTitle.includes('domingo') ||
      lowerTitle.includes('feriado')) {
    return 'Festas'
  }

  if (lowerTitle.includes('teatro') || lowerTitle.includes('peça')) {
    return 'Teatro'
  }
  if (lowerTitle.includes('exposição') || lowerTitle.includes('arte') || lowerTitle.includes('galeria')) {
    return 'Exposições'
  }
  if (lowerTitle.includes('cinema') || lowerTitle.includes('filme')) {
    return 'Cinema'
  }
  if (lowerTitle.includes('oficina') || lowerTitle.includes('workshop')) {
    return 'Oficinas'
  }

  // Padrão para Instagram Agenda Alternativa: maioria são Shows/Festas
  return 'Shows'
}

async function fixInstagramCategories() {
  console.log('🔧 Atualizando categorias de eventos do Instagram...\n')

  // Buscar todos os eventos do Instagram
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, category')
    .eq('source', 'instagram')

  if (error) {
    console.error('❌ Erro ao buscar eventos:', error)
    process.exit(1)
  }

  if (!events || events.length === 0) {
    console.log('⚠️  Nenhum evento do Instagram encontrado')
    process.exit(0)
  }

  console.log(`📊 Encontrados ${events.length} eventos do Instagram\n`)

  let updated = 0
  let unchanged = 0

  for (const event of events) {
    const newCategory = extractCategory(event.title)
    
    if (event.category !== newCategory) {
      console.log(`🔄 ${event.title}`)
      console.log(`   Categoria antiga: ${event.category}`)
      console.log(`   Categoria nova: ${newCategory}\n`)
      
      const { error: updateError } = await supabase
        .from('events')
        .update({ category: newCategory })
        .eq('id', event.id)

      if (updateError) {
        console.error(`❌ Erro ao atualizar evento ${event.id}:`, updateError)
      } else {
        updated++
      }
    } else {
      unchanged++
    }
  }

  console.log(`\n✅ Atualização concluída:`)
  console.log(`   Atualizados: ${updated}`)
  console.log(`   Sem alteração: ${unchanged}`)
  console.log(`   Total: ${events.length}`)
}

fixInstagramCategories()
