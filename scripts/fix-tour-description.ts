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
 * Remove tags HTML e formatação Word de texto
 */
function cleanHtmlText(text: string): string {
  return text
    .replace(/<p[^>]*>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<span[^>]*>/g, '')
    .replace(/<\/span>/g, '')
    .replace(/<b>/g, '')
    .replace(/<\/b>/g, '')
    .replace(/<i>/g, '')
    .replace(/<\/i>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

async function fixTourDescription() {
  console.log('🔧 Atualizando descrição do roteiro...\n')

  const tourId = 'f9815b09-20e7-40fe-ac83-e9adf7357ce1'
  
  // Nova descrição mais descontraída, sem etarismo
  const newDescription = `Para quem curte agito, boa música e a noite vibrante do Rio Vermelho. Uma sequência de shows para dançar e celebrar a noite soteropolitana.`

  const { error } = await supabase
    .from('tours')
    .update({ description: newDescription })
    .eq('id', tourId)

  if (error) {
    console.error('❌ Erro ao atualizar roteiro:', error)
    process.exit(1)
  }

  console.log('✅ Descrição do roteiro atualizada:')
  console.log(`   ID: ${tourId}`)
  console.log(`   Nova descrição: ${newDescription}`)
}

async function cleanEventDescriptions() {
  console.log('\n🔧 Limpando tags HTML de descrições de eventos...\n')

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description')
    .not('description', 'is', null)

  if (error) {
    console.error('❌ Erro ao buscar eventos:', error)
    process.exit(1)
  }

  if (!events || events.length === 0) {
    console.log('⚠️  Nenhum evento com descrição encontrado')
    return
  }

  let cleaned = 0

  for (const event of events) {
    if (!event.description) continue

    const cleanedDescription = cleanHtmlText(event.description)
    
    if (cleanedDescription !== event.description) {
      console.log(`🔄 ${event.title}`)
      console.log(`   Antes: ${event.description.substring(0, 100)}...`)
      console.log(`   Depois: ${cleanedDescription.substring(0, 100)}...`)
      console.log()

      const { error: updateError } = await supabase
        .from('events')
        .update({ description: cleanedDescription })
        .eq('id', event.id)

      if (updateError) {
        console.error(`❌ Erro ao atualizar evento ${event.id}:`, updateError)
      } else {
        cleaned++
      }
    }
  }

  console.log(`\n✅ Limpeza concluída: ${cleaned} evento(s) atualizado(s)`)
}

async function main() {
  await fixTourDescription()
  await cleanEventDescriptions()
}

main()
