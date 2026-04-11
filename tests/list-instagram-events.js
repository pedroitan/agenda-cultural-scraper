import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

async function listInstagramEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('title, start_datetime, venue_name, price_text, category, is_free')
    .eq('source', 'instagram')
    .order('start_datetime', { ascending: true })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`\n📸 Instagram Events (${data.length} total):\n`)
  
  data.forEach((event, index) => {
    const date = new Date(event.start_datetime)
    const dateStr = date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    })
    const timeStr = date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    console.log(`${index + 1}. ${event.title}`)
    console.log(`   📅 ${dateStr} às ${timeStr}`)
    console.log(`   📍 ${event.venue_name || 'Local não especificado'}`)
    console.log(`   💰 ${event.is_free ? 'Grátis' : (event.price_text || 'Consulte')}`)
    console.log(`   🏷️  ${event.category}`)
    console.log('')
  })
}

listInstagramEvents()
