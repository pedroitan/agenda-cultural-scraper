import 'dotenv/config'
import { supabase } from './src/supabase.js'

type EventRow = {
  id: string
  title: string
  start_datetime: string
  venue_name: string | null
  category: string | null
  is_active: boolean | null
}

const SAT_START = '2026-05-16T00:00:00'
const SAT_END = '2026-05-17T05:00:00'
const SUN_START = '2026-05-17T00:00:00'
const SUN_END = '2026-05-18T05:00:00'

async function findEvent(filter: {
  startAfter: string
  startBefore: string
  venueLike?: string[]
  titleLike?: string[]
  categoryLike?: string[]
  excludeIds?: string[]
}): Promise<EventRow | null> {
  let query = supabase
    .from('events')
    .select('id, title, start_datetime, venue_name, category, is_active')
    .gte('start_datetime', filter.startAfter)
    .lt('start_datetime', filter.startBefore)
    .eq('city', 'salvador')
    .eq('is_active', true)
    .order('start_datetime', { ascending: true })

  // OR conditions across venue/title/category
  const orParts: string[] = []
  for (const v of filter.venueLike || []) orParts.push(`venue_name.ilike.%${v}%`)
  for (const t of filter.titleLike || []) orParts.push(`title.ilike.%${t}%`)
  for (const c of filter.categoryLike || []) orParts.push(`category.ilike.%${c}%`)

  if (orParts.length > 0) {
    query = query.or(orParts.join(','))
  }

  const { data } = await query.limit(20)
  if (!data || data.length === 0) return null

  // Filter out excluded ids
  const filtered = data.filter(d => !filter.excludeIds?.includes(d.id))
  return (filtered[0] as EventRow) || null
}

async function createTour(tour: {
  title: string
  description: string
  imageUrl: string
}, stops: { eventId: string; horario: string; duracao: number; deslocProximo: number | null; modo: string | null }[]) {
  const { data: tourData, error: tourErr } = await supabase
    .from('tours')
    .insert({
      title: tour.title,
      curator_name: 'Agenda Cultural Salvador',
      curator_bio: 'Curadoria local',
      description: tour.description,
      image_url: tour.imageUrl,
      is_published: true,
      city: 'salvador',
    })
    .select('id')
    .single()

  if (tourErr || !tourData) {
    console.error('❌ Tour insert error:', tourErr)
    return null
  }

  const stopsToInsert = stops.map((s, i) => ({
    tour_id: tourData.id,
    event_id: s.eventId,
    horario: s.horario,
    duracao_min: s.duracao,
    deslocamento_proximo_min: s.deslocProximo,
    modo_deslocamento: s.modo,
    order_index: i + 1,
  }))

  const { error: stopsErr } = await supabase.from('tour_stops').insert(stopsToInsert)
  if (stopsErr) {
    console.error('❌ Stops insert error:', stopsErr)
    return null
  }

  return tourData.id
}

async function main() {
  console.log('========== Seeding 4 Weekend Tours for Salvador ==========\n')

  // 1. Clean old tours
  console.log('1. Cleaning old Salvador tours...')
  const { data: oldTours } = await supabase.from('tours').select('id').eq('city', 'salvador')
  if (oldTours && oldTours.length > 0) {
    const ids = oldTours.map(t => t.id)
    await supabase.from('tour_stops').delete().in('tour_id', ids)
    await supabase.from('tours').delete().in('id', ids)
    console.log(`   ✅ Deleted ${oldTours.length} old tours\n`)
  }

  // ════════════════════════════════════════════
  // TOUR 1: Sábado Tropical no Rio Vermelho
  // ════════════════════════════════════════════
  console.log('2. Tour 1: Sábado Tropical no Rio Vermelho')
  const t1_e1 = await findEvent({
    startAfter: '2026-05-16T18:00:00',
    startBefore: '2026-05-16T22:00:00',
    venueLike: ['rio vermelho'],
  })
  const t1_e2 = await findEvent({
    startAfter: '2026-05-16T22:00:00',
    startBefore: '2026-05-17T01:00:00',
    venueLike: ['rio vermelho'],
    excludeIds: t1_e1 ? [t1_e1.id] : [],
  })
  const t1_e3 = await findEvent({
    startAfter: '2026-05-17T00:00:00',
    startBefore: '2026-05-17T04:00:00',
    venueLike: ['rio vermelho'],
    excludeIds: [t1_e1?.id, t1_e2?.id].filter(Boolean) as string[],
  })

  const t1Stops = [t1_e1, t1_e2, t1_e3].filter(Boolean) as EventRow[]
  console.log(`   Events found: ${t1Stops.length}`)
  t1Stops.forEach((e, i) => console.log(`   ${i + 1}. ${e.title.substring(0, 60)} @ ${e.venue_name}`))

  if (t1Stops.length > 0) {
    await createTour(
      {
        title: 'Sábado Tropical no Rio Vermelho',
        description: 'Para quem quer viver a vibe boêmia do bairro mais animado de Salvador. Comece com um esquenta de samba ou MPB, parta para um show principal em uma das casas tradicionais, e termine madrugada adentro. O Rio Vermelho num só roteiro.',
        imageUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&auto=format&fit=crop',
      },
      [
        { eventId: t1Stops[0].id, horario: '21:00', duracao: 120, deslocProximo: 15, modo: 'caminhando' },
        ...(t1Stops[1] ? [{ eventId: t1Stops[1].id, horario: '23:00', duracao: 120, deslocProximo: 10, modo: 'caminhando' }] : []),
        ...(t1Stops[2] ? [{ eventId: t1Stops[2].id, horario: '01:00', duracao: 180, deslocProximo: null, modo: null }] : []),
      ]
    )
    console.log('   ✅ Tour created\n')
  }

  // ════════════════════════════════════════════
  // TOUR 2: Sábado em Família (diurno)
  // ════════════════════════════════════════════
  console.log('3. Tour 2: Sábado em Família')
  const t2_e1 = await findEvent({
    startAfter: '2026-05-16T08:00:00',
    startBefore: '2026-05-16T12:00:00',
    titleLike: ['brincant', 'infantil', 'criança', 'manhã', 'família'],
    categoryLike: ['infantil'],
  })
  const t2_e2 = await findEvent({
    startAfter: '2026-05-16T12:00:00',
    startBefore: '2026-05-16T16:00:00',
    titleLike: ['bento', 'totó', 'infantil', 'oficina'],
    categoryLike: ['teatro', 'cultura'],
    excludeIds: t2_e1 ? [t2_e1.id] : [],
  })
  const t2_e3 = await findEvent({
    startAfter: '2026-05-16T16:00:00',
    startBefore: '2026-05-16T20:00:00',
    venueLike: ['teatro', 'sesc'],
    categoryLike: ['teatro', 'cultura'],
    excludeIds: [t2_e1?.id, t2_e2?.id].filter(Boolean) as string[],
  })

  const t2Stops = [t2_e1, t2_e2, t2_e3].filter(Boolean) as EventRow[]
  console.log(`   Events found: ${t2Stops.length}`)
  t2Stops.forEach((e, i) => console.log(`   ${i + 1}. ${e.title.substring(0, 60)} @ ${e.venue_name}`))

  if (t2Stops.length > 0) {
    await createTour(
      {
        title: 'Sábado em Família',
        description: 'Diversão garantida do café da manhã ao fim da tarde. Comece com uma atividade lúdica para os pequenos, almoce e curtam um espetáculo infantil ou apresentação cultural. Programação leve, segura e divertida para toda a família.',
        imageUrl: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&auto=format&fit=crop',
      },
      t2Stops.map((e, i) => ({
        eventId: e.id,
        horario: ['09:00', '12:00', '16:00'][i],
        duracao: 120,
        deslocProximo: i < t2Stops.length - 1 ? 45 : null,
        modo: i < t2Stops.length - 1 ? 'carro' : null,
      }))
    )
    console.log('   ✅ Tour created\n')
  }

  // ════════════════════════════════════════════
  // TOUR 3: Pelourinho Boêmio
  // ════════════════════════════════════════════
  console.log('4. Tour 3: Pelourinho Boêmio')
  const t3_e1 = await findEvent({
    startAfter: '2026-05-16T17:00:00',
    startBefore: '2026-05-16T21:00:00',
    venueLike: ['pelourinho', 'pelô', 'solar', 'terreiro', 'largo'],
  })
  const t3_e2 = await findEvent({
    startAfter: '2026-05-16T20:00:00',
    startBefore: '2026-05-16T23:00:00',
    venueLike: ['pelourinho', 'clube do samba', 'sesc pelourinho', 'largo'],
    excludeIds: t3_e1 ? [t3_e1.id] : [],
  })
  const t3_e3 = await findEvent({
    startAfter: '2026-05-16T22:00:00',
    startBefore: '2026-05-17T02:00:00',
    venueLike: ['pelourinho', 'clube do samba'],
    titleLike: ['samba', 'pagode'],
    excludeIds: [t3_e1?.id, t3_e2?.id].filter(Boolean) as string[],
  })

  const t3Stops = [t3_e1, t3_e2, t3_e3].filter(Boolean) as EventRow[]
  console.log(`   Events found: ${t3Stops.length}`)
  t3Stops.forEach((e, i) => console.log(`   ${i + 1}. ${e.title.substring(0, 60)} @ ${e.venue_name}`))

  if (t3Stops.length > 0) {
    await createTour(
      {
        title: 'Pelourinho Boêmio',
        description: 'A Salvador mais autêntica num só roteiro. Suba os paralelepípedos do Centro Histórico, sinta o samba ecoar nas casas tradicionais do Pelô e termine a noite no berço do samba baiano. Para quem quer experimentar a alma da cidade.',
        imageUrl: 'https://images.unsplash.com/photo-1591789532213-30fb73e6ca12?w=800&auto=format&fit=crop',
      },
      t3Stops.map((e, i) => ({
        eventId: e.id,
        horario: ['18:00', '20:30', '23:30'][i],
        duracao: i === 0 ? 90 : 150,
        deslocProximo: i < t3Stops.length - 1 ? 15 : null,
        modo: i < t3Stops.length - 1 ? 'caminhando' : null,
      }))
    )
    console.log('   ✅ Tour created\n')
  }

  // ════════════════════════════════════════════
  // TOUR 4: Domingo Cultural
  // ════════════════════════════════════════════
  console.log('5. Tour 4: Domingo Cultural')
  const t4_e1 = await findEvent({
    startAfter: '2026-05-17T10:00:00',
    startBefore: '2026-05-17T16:00:00',
    venueLike: ['teatro', 'sesc', 'pelourinho'],
    categoryLike: ['teatro', 'cultura', 'arte'],
  })
  const t4_e2 = await findEvent({
    startAfter: '2026-05-17T16:00:00',
    startBefore: '2026-05-17T20:00:00',
    venueLike: ['teatro', 'concha'],
    categoryLike: ['teatro', 'show', 'cultura'],
    excludeIds: t4_e1 ? [t4_e1.id] : [],
  })
  const t4_e3 = await findEvent({
    startAfter: '2026-05-17T19:00:00',
    startBefore: '2026-05-17T23:30:00',
    venueLike: ['teatro', 'sesc', 'casa'],
    categoryLike: ['show', 'cultura'],
    excludeIds: [t4_e1?.id, t4_e2?.id].filter(Boolean) as string[],
  })

  const t4Stops = [t4_e1, t4_e2, t4_e3].filter(Boolean) as EventRow[]
  console.log(`   Events found: ${t4Stops.length}`)
  t4Stops.forEach((e, i) => console.log(`   ${i + 1}. ${e.title.substring(0, 60)} @ ${e.venue_name}`))

  if (t4Stops.length > 0) {
    await createTour(
      {
        title: 'Domingo Cultural',
        description: 'Um domingo dedicado às artes em Salvador. Comece com uma matinê em um dos teatros emblemáticos, siga para um espetáculo de teatro ou dança no fim da tarde, e encerre com um show de música ao vivo. Cultura para fechar o fim de semana com chave de ouro.',
        imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&auto=format&fit=crop',
      },
      t4Stops.map((e, i) => ({
        eventId: e.id,
        horario: ['15:00', '17:30', '20:00'][i],
        duracao: 120,
        deslocProximo: i < t4Stops.length - 1 ? 30 : null,
        modo: i < t4Stops.length - 1 ? 'carro' : null,
      }))
    )
    console.log('   ✅ Tour created\n')
  }

  // Verify
  console.log('========== Verification ==========')
  const { data: tours } = await supabase
    .from('tours')
    .select('id, title')
    .eq('city', 'salvador')
    .order('created_at', { ascending: true })

  for (const t of tours || []) {
    const { count } = await supabase
      .from('tour_stops')
      .select('*', { count: 'exact', head: true })
      .eq('tour_id', t.id)
    console.log(`   • ${t.title} — ${count} paradas`)
  }
}

main().catch(console.error)
