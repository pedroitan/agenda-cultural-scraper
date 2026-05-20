import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

// ─── Date helpers ──────────────────────────────────────────────────────────────

function getTodayBahia(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' })
}

function getUpcomingWeekend(): { saturday: string; sunday: string } {
  const today = new Date(getTodayBahia())
  const day = today.getDay() // 0=Sun, 6=Sat

  let daysToSat: number
  if (day === 6) daysToSat = 0
  else if (day === 0) daysToSat = 6
  else daysToSat = 6 - day

  const sat = new Date(today)
  sat.setDate(today.getDate() + daysToSat)

  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)

  const fmt = (d: Date) => d.toLocaleDateString('en-CA')
  return { saturday: fmt(sat), sunday: fmt(sun) }
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  const months = ['','jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  return `${parseInt(d)} de ${months[parseInt(m)]} de ${y}`
}

// ─── Supabase queries ──────────────────────────────────────────────────────────

type DBEvent = {
  id: string
  title: string
  start_datetime: string
  venue_name: string | null
  category: string | null
  price_text: string | null
  is_free: boolean
  description: string | null
  url: string
  image_url: string | null
}

async function getEventsForDate(date: string): Promise<DBEvent[]> {
  const start = `${date}T00:00:00`
  const end = `${date}T23:59:59`

  const { data, error } = await supabase
    .from('events')
    .select('id, title, start_datetime, venue_name, category, price_text, is_free, description, url, image_url')
    .eq('city', 'salvador')
    .gte('start_datetime', start)
    .lte('start_datetime', end)
    .not('venue_name', 'is', null)
    .order('start_datetime', { ascending: true })
    .limit(60)

  if (error) throw error
  return (data || []) as DBEvent[]
}

async function toursExistForDate(date: string): Promise<boolean> {
  const { count } = await supabase
    .from('tours')
    .select('*', { count: 'exact', head: true })
    .eq('city', 'salvador')
    .eq('scheduled_date', date)
    .eq('is_published', true)

  return (count ?? 0) > 0
}

async function deleteToursForDate(date: string): Promise<void> {
  // Buscar tours da data
  const { data: existing } = await supabase
    .from('tours')
    .select('id')
    .eq('city', 'salvador')
    .eq('scheduled_date', date)

  if (!existing || existing.length === 0) return

  const ids = existing.map(t => t.id)

  // Deletar stops primeiro (FK)
  await supabase.from('tour_stops').delete().in('tour_id', ids)

  // Deletar tours
  await supabase.from('tours').delete().in('id', ids)

  console.log(`   🗑️  Deleted ${ids.length} existing tour(s) for ${date}`)
}

// ─── AI generation ─────────────────────────────────────────────────────────────

type AITourStop = {
  event_index: number
  horario: string
  duracao_min: number
  deslocamento_proximo_min: number | null
  modo_deslocamento: string | null
  note: string | null
}

type AITour = {
  title: string
  description: string
  stops: AITourStop[]
}

function buildPrompt(events: DBEvent[], date: string): string {
  const dateBR = formatDateBR(date)
  const dayName = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })

  const eventsText = events.map((ev, i) => {
    const time = new Date(ev.start_datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' })
    const price = ev.is_free ? 'Grátis' : (ev.price_text || 'Consulte')
    return `[${i}] "${ev.title}" | Local: ${ev.venue_name} | ${time} | ${ev.category || 'Cultura'} | ${price}`
  }).join('\n')

  return `Você é um curador cultural de Salvador, Bahia. Hoje é ${dayName}, ${dateBR}.

Abaixo estão eventos acontecendo neste dia em Salvador. Crie EXATAMENTE 2 roteiros culturais distintos, cada um com 2 a 3 paradas que façam sentido temático ou geográfico juntas.

EVENTOS DISPONÍVEIS:
${eventsText}

REGRAS:
- Cada roteiro deve usar eventos DIFERENTES (sem repetir o mesmo evento em dois roteiros)
- As paradas devem fluir naturalmente por horário (do mais cedo para o mais tarde)
- O título deve ser criativo e capturar a essência do roteiro (ex: "Tarde Boêmia no Rio Vermelho")
- A descrição deve ter 2-3 frases convidativas sobre a experiência
- Inclua estimativas realistas de duração e deslocamento
- modo_deslocamento: "a pé", "Uber/taxi", "carro" ou null
- Se o evento for de noite (após 19h), priorize eventos noturnos juntos

Responda APENAS com JSON válido neste formato (sem markdown, sem explicação):
[
  {
    "title": "...",
    "description": "...",
    "stops": [
      {
        "event_index": 0,
        "horario": "15:00",
        "duracao_min": 90,
        "deslocamento_proximo_min": 15,
        "modo_deslocamento": "a pé",
        "note": null
      }
    ]
  }
]`
}

async function generateToursWithAI(events: DBEvent[], date: string): Promise<AITour[]> {
  if (events.length < 4) {
    console.log(`   ⚠️  Only ${events.length} events found for ${date}, need at least 4. Skipping AI generation.`)
    return []
  }

  console.log(`\n🤖 Calling Gemini to generate tours for ${date} (${events.length} events available)...`)

  const prompt = buildPrompt(events, date)

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  // Remove markdown code blocks if present
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  try {
    const parsed = JSON.parse(jsonText) as AITour[]
    console.log(`   ✅ Generated ${parsed.length} tour(s)`)
    return parsed
  } catch (err) {
    console.error(`   ❌ Failed to parse Gemini response:`, jsonText.substring(0, 500))
    throw new Error(`Invalid JSON from Gemini: ${err}`)
  }
}

// ─── DB insertion ──────────────────────────────────────────────────────────────

async function saveTours(aiTours: AITour[], events: DBEvent[], date: string): Promise<void> {
  for (const aiTour of aiTours) {
    console.log(`\n💾 Saving tour: "${aiTour.title}"`)

    // Insert tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .insert({
        title: aiTour.title,
        description: aiTour.description,
        curator_name: 'Agenda Cultural Salvador',
        curator_bio: 'Curadoria automática baseada nos melhores eventos da semana.',
        city: 'salvador',
        is_published: true,
        scheduled_date: date,
      })
      .select('id')
      .single()

    if (tourError) {
      console.error(`   ❌ Failed to insert tour: ${tourError.message}`)
      continue
    }

    console.log(`   ✅ Tour created: ${tour.id}`)

    // Insert stops
    for (let i = 0; i < aiTour.stops.length; i++) {
      const stop = aiTour.stops[i]
      const event = events[stop.event_index]

      if (!event) {
        console.warn(`   ⚠️  Stop ${i}: event_index ${stop.event_index} not found, skipping`)
        continue
      }

      const { error: stopError } = await supabase
        .from('tour_stops')
        .insert({
          tour_id: tour.id,
          event_id: event.id,
          order_index: i + 1,
          horario: stop.horario,
          duracao_min: stop.duracao_min,
          deslocamento_proximo_min: stop.deslocamento_proximo_min,
          modo_deslocamento: stop.modo_deslocamento,
        })

      if (stopError) {
        console.error(`   ❌ Failed to insert stop ${i + 1}: ${stopError.message}`)
      } else {
        console.log(`   ✅ Stop ${i + 1}: "${event.title}" @ ${event.venue_name} (${stop.horario})`)
      }
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🗓️  Weekend Tours Generator — Salvador\n')

  const forceRegenerate = process.env.FORCE_REGENERATE === 'true'
  if (forceRegenerate) console.log('⚡ FORCE_REGENERATE=true — existing tours will be replaced\n')

  const { saturday, sunday } = getUpcomingWeekend()
  console.log(`📅 Upcoming weekend: ${formatDateBR(saturday)} (sábado) e ${formatDateBR(sunday)} (domingo)`)

  for (const [label, date] of [['Sábado', saturday], ['Domingo', sunday]] as const) {
    console.log(`\n──────────────────────────────────────────`)
    console.log(`📆 Processing ${label} — ${date}`)

    const exists = await toursExistForDate(date)

    if (exists && !forceRegenerate) {
      console.log(`   ⏭️  Tours already exist for ${date}, skipping. (use FORCE_REGENERATE=true to overwrite)`)
      continue
    }

    if (exists && forceRegenerate) {
      await deleteToursForDate(date)
    }

    // Fetch events
    const events = await getEventsForDate(date)
    console.log(`   📋 Found ${events.length} events with venue`)

    if (events.length === 0) {
      console.log(`   ⚠️  No events found for ${date}, skipping.`)
      continue
    }

    // Generate tours with AI
    const aiTours = await generateToursWithAI(events, date)
    if (aiTours.length === 0) continue

    // Save to DB
    await saveTours(aiTours, events, date)
  }

  console.log('\n\n✅ Done!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
