import 'dotenv/config'
import { supabase } from './src/supabase.js'

type EventRow = {
  id: string
  title: string
  description: string | null
  start_datetime: string
  venue_name: string | null
  venue_address: string | null
  category: string | null
  image_url: string | null
  is_active: boolean | null
}

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
    .select('id, title, description, start_datetime, venue_name, venue_address, category, image_url, is_active')
    .gte('start_datetime', filter.startAfter)
    .lt('start_datetime', filter.startBefore)
    .eq('city', 'salvador')
    .eq('is_active', true)
    .order('start_datetime', { ascending: true })

  const orParts: string[] = []
  for (const v of filter.venueLike || []) orParts.push(`venue_name.ilike.%${v}%`)
  for (const t of filter.titleLike || []) orParts.push(`title.ilike.%${t}%`)
  for (const c of filter.categoryLike || []) orParts.push(`category.ilike.%${c}%`)

  if (orParts.length > 0) query = query.or(orParts.join(','))

  const { data } = await query.limit(20)
  if (!data) return null
  return (data.filter(d => !filter.excludeIds?.includes(d.id))[0] as EventRow) || null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 60)
}

async function createTour(
  meta: {
    title: string
    description: string
    imageUrl: string
    durationHours: number
    difficulty: 'easy' | 'medium' | 'hard'
  },
  events: EventRow[],
  horarios: string[]
) {
  const slug = `${slugify(meta.title)}-${Date.now()}`

  const { data: tour, error: tourErr } = await supabase
    .from('tours')
    .insert({
      title: meta.title,
      description: meta.description,
      slug,
      duration_hours: meta.durationHours,
      difficulty: meta.difficulty,
      image_url: meta.imageUrl,
      is_active: true,
      city: 'salvador',
    })
    .select('id')
    .single()

  if (tourErr || !tour) {
    console.error('   ❌ Tour insert error:', tourErr?.message)
    return null
  }

  const stops = events.map((ev, i) => ({
    tour_id: tour.id,
    order_index: i + 1,
    title: `${horarios[i]} — ${ev.title.substring(0, 100)}`,
    description: ev.description?.substring(0, 500) || null,
    venue_name: ev.venue_name,
    address: ev.venue_address,
    duration_minutes: 120,
  }))

  const { error: stopsErr } = await supabase.from('tour_stops').insert(stops)
  if (stopsErr) {
    console.error('   ❌ Stops insert error:', stopsErr.message)
    return null
  }

  return tour.id
}

async function main() {
  console.log('========== Seeding 4 Weekend Tours for Salvador ==========\n')

  // Cleanup
  console.log('1. Cleaning old Salvador tours...')
  const { data: oldTours } = await supabase.from('tours').select('id').eq('city', 'salvador')
  if (oldTours && oldTours.length > 0) {
    const ids = oldTours.map(t => t.id)
    await supabase.from('tour_stops').delete().in('tour_id', ids)
    await supabase.from('tours').delete().in('id', ids)
    console.log(`   ✅ Deleted ${oldTours.length} old tours\n`)
  }

  // ════ TOUR 1: Sábado Tropical no Rio Vermelho ════
  console.log('2. Tour 1: Sábado Tropical no Rio Vermelho')
  const t1 = [
    await findEvent({
      startAfter: '2026-05-16T18:00:00',
      startBefore: '2026-05-16T22:00:00',
      venueLike: ['rio vermelho'],
    }),
  ]
  t1.push(await findEvent({
    startAfter: '2026-05-16T22:00:00',
    startBefore: '2026-05-17T01:00:00',
    venueLike: ['rio vermelho'],
    excludeIds: t1.filter(Boolean).map(e => e!.id),
  }))
  t1.push(await findEvent({
    startAfter: '2026-05-17T00:00:00',
    startBefore: '2026-05-17T04:00:00',
    venueLike: ['rio vermelho'],
    excludeIds: t1.filter(Boolean).map(e => e!.id),
  }))

  const t1Stops = t1.filter(Boolean) as EventRow[]
  console.log(`   Events: ${t1Stops.length}`)
  t1Stops.forEach((e, i) => console.log(`   ${i + 1}. ${e.title.substring(0, 55)} @ ${e.venue_name}`))

  if (t1Stops.length > 0) {
    const id = await createTour(
      {
        title: 'Sábado Tropical no Rio Vermelho',
        description: 'Para quem quer viver a vibe boêmia do bairro mais animado de Salvador. Comece com um esquenta de samba ou MPB, parta para um show principal em uma das casas tradicionais, e termine madrugada adentro. O Rio Vermelho num só roteiro.',
        imageUrl: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&auto=format&fit=crop',
        durationHours: 6,
        difficulty: 'easy',
      },
      t1Stops,
      ['21:00', '23:00', '01:00']
    )
    if (id) console.log(`   ✅ Tour created (${id})\n`)
  }

  // ════ TOUR 2: Sábado em Família ════
  console.log('3. Tour 2: Sábado em Família')
  const t2 = [
    await findEvent({
      startAfter: '2026-05-16T08:00:00',
      startBefore: '2026-05-16T12:00:00',
      titleLike: ['brincant', 'infantil', 'criança', 'manhã', 'família'],
      categoryLike: ['infantil'],
    }),
  ]
  t2.push(await findEvent({
    startAfter: '2026-05-16T12:00:00',
    startBefore: '2026-05-16T16:00:00',
    titleLike: ['bento', 'totó', 'infantil'],
    categoryLike: ['teatro', 'cultura'],
    excludeIds: t2.filter(Boolean).map(e => e!.id),
  }))
  t2.push(await findEvent({
    startAfter: '2026-05-16T16:00:00',
    startBefore: '2026-05-16T20:00:00',
    venueLike: ['teatro', 'sesc'],
    categoryLike: ['teatro', 'cultura'],
    excludeIds: t2.filter(Boolean).map(e => e!.id),
  }))

  const t2Stops = t2.filter(Boolean) as EventRow[]
  console.log(`   Events: ${t2Stops.length}`)
  t2Stops.forEach((e, i) => console.log(`   ${i + 1}. ${e.title.substring(0, 55)} @ ${e.venue_name}`))

  if (t2Stops.length > 0) {
    const id = await createTour(
      {
        title: 'Sábado em Família',
        description: 'Diversão garantida do café da manhã ao fim da tarde. Comece com uma atividade lúdica para os pequenos, almoce e curtam um espetáculo infantil ou apresentação cultural. Programação leve, segura e divertida para toda a família.',
        imageUrl: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&auto=format&fit=crop',
        durationHours: 8,
        difficulty: 'easy',
      },
      t2Stops,
      ['09:00', '12:00', '16:00']
    )
    if (id) console.log(`   ✅ Tour created (${id})\n`)
  }

  // ════ TOUR 3: Pelourinho Boêmio ════
  console.log('4. Tour 3: Pelourinho Boêmio')
  const t3 = [
    await findEvent({
      startAfter: '2026-05-16T17:00:00',
      startBefore: '2026-05-16T21:00:00',
      venueLike: ['pelourinho', 'pelô', 'solar', 'terreiro', 'largo'],
    }),
  ]
  t3.push(await findEvent({
    startAfter: '2026-05-16T20:00:00',
    startBefore: '2026-05-16T23:00:00',
    venueLike: ['pelourinho', 'clube do samba', 'sesc'],
    excludeIds: t3.filter(Boolean).map(e => e!.id),
  }))
  t3.push(await findEvent({
    startAfter: '2026-05-16T22:00:00',
    startBefore: '2026-05-17T02:00:00',
    venueLike: ['pelourinho', 'clube do samba'],
    titleLike: ['samba', 'pagode'],
    excludeIds: t3.filter(Boolean).map(e => e!.id),
  }))

  const t3Stops = t3.filter(Boolean) as EventRow[]
  console.log(`   Events: ${t3Stops.length}`)
  t3Stops.forEach((e, i) => console.log(`   ${i + 1}. ${e.title.substring(0, 55)} @ ${e.venue_name}`))

  if (t3Stops.length > 0) {
    const id = await createTour(
      {
        title: 'Pelourinho Boêmio',
        description: 'A Salvador mais autêntica num só roteiro. Suba os paralelepípedos do Centro Histórico, sinta o samba ecoar nas casas tradicionais do Pelô e termine a noite no berço do samba baiano. Para quem quer experimentar a alma da cidade.',
        imageUrl: 'https://images.unsplash.com/photo-1591789532213-30fb73e6ca12?w=800&auto=format&fit=crop',
        durationHours: 7,
        difficulty: 'easy',
      },
      t3Stops,
      ['18:00', '20:30', '23:30']
    )
    if (id) console.log(`   ✅ Tour created (${id})\n`)
  }

  // ════ TOUR 4: Domingo Cultural ════
  console.log('5. Tour 4: Domingo Cultural')
  const t4 = [
    await findEvent({
      startAfter: '2026-05-17T10:00:00',
      startBefore: '2026-05-17T16:00:00',
      venueLike: ['teatro', 'sesc', 'pelourinho'],
      categoryLike: ['teatro', 'cultura', 'arte'],
    }),
  ]
  t4.push(await findEvent({
    startAfter: '2026-05-17T16:00:00',
    startBefore: '2026-05-17T20:00:00',
    venueLike: ['teatro', 'concha'],
    categoryLike: ['teatro', 'show', 'cultura'],
    excludeIds: t4.filter(Boolean).map(e => e!.id),
  }))
  t4.push(await findEvent({
    startAfter: '2026-05-17T19:00:00',
    startBefore: '2026-05-17T23:30:00',
    venueLike: ['teatro', 'sesc', 'casa'],
    categoryLike: ['show', 'cultura'],
    excludeIds: t4.filter(Boolean).map(e => e!.id),
  }))

  const t4Stops = t4.filter(Boolean) as EventRow[]
  console.log(`   Events: ${t4Stops.length}`)
  t4Stops.forEach((e, i) => console.log(`   ${i + 1}. ${e.title.substring(0, 55)} @ ${e.venue_name}`))

  if (t4Stops.length > 0) {
    const id = await createTour(
      {
        title: 'Domingo Cultural',
        description: 'Um domingo dedicado às artes em Salvador. Comece com uma matinê em um dos teatros emblemáticos, siga para um espetáculo de teatro ou dança no fim da tarde, e encerre com um show de música ao vivo. Cultura para fechar o fim de semana com chave de ouro.',
        imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&auto=format&fit=crop',
        durationHours: 7,
        difficulty: 'easy',
      },
      t4Stops,
      ['15:00', '17:30', '20:00']
    )
    if (id) console.log(`   ✅ Tour created (${id})\n`)
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
