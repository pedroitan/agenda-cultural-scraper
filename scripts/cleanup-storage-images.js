import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DRY_RUN = process.argv.includes('--dry-run')
const DAYS_BUFFER = 7
const cutoffDate = new Date(Date.now() - DAYS_BUFFER * 24 * 60 * 60 * 1000)

console.log('\n🧹 Cleanup Supabase Storage')
console.log('='.repeat(60))
console.log(`� Removendo imagens com mais de ${DAYS_BUFFER} dias (antes de ${cutoffDate.toLocaleDateString('pt-BR')})`)
if (DRY_RUN) console.log('⚠️  DRY RUN - nenhum arquivo será deletado\n')

let totalDeleted = 0

// ─── PARTE 1: Imagens de eventos passados (event-images) ─────────────────────
console.log('\n� PARTE 1: event-images (imagens de eventos)')
console.log('-'.repeat(60))

const { data: pastEvents, error: eventsError } = await supabase
  .from('events')
  .select('id, title, source, image_url, start_datetime')
  .lt('start_datetime', cutoffDate.toISOString())
  .like('image_url', '%supabase%')
  .order('start_datetime', { ascending: false })

if (eventsError) {
  console.error('❌ Erro ao buscar eventos:', eventsError.message)
  process.exit(1)
}

console.log(`   Eventos passados (+${DAYS_BUFFER} dias) com imagem no Supabase: ${pastEvents?.length || 0}`)

if (pastEvents && pastEvents.length > 0) {
  pastEvents.slice(0, 5).forEach(e => {
    const date = new Date(e.start_datetime).toLocaleDateString('pt-BR')
    console.log(`   - [${date}] ${e.title.substring(0, 50)} (${e.source})`)
  })
  if (pastEvents.length > 5) console.log(`   ... e mais ${pastEvents.length - 5} eventos`)

  const pathsToDelete = pastEvents
    .map(e => {
      if (!e.image_url) return null
      const match = e.image_url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
      if (!match) return null
      return { bucket: match[1], path: match[2], eventId: e.id }
    })
    .filter(Boolean)

  console.log(`\n   📋 Arquivos para deletar: ${pathsToDelete.length}`)

  if (!DRY_RUN && pathsToDelete.length > 0) {
    const byBucket = {}
    pathsToDelete.forEach(({ bucket, path }) => {
      if (!byBucket[bucket]) byBucket[bucket] = []
      byBucket[bucket].push(path)
    })

    for (const [bucketName, paths] of Object.entries(byBucket)) {
      const batchSize = 100
      for (let i = 0; i < paths.length; i += batchSize) {
        const batch = paths.slice(i, i + batchSize)
        const { error: deleteError } = await supabase.storage.from(bucketName).remove(batch)
        if (deleteError) {
          console.error(`   ❌ Erro ao deletar lote: ${deleteError.message}`)
        } else {
          totalDeleted += batch.length
          console.log(`   ✅ Lote ${Math.floor(i/batchSize) + 1}: ${batch.length} arquivos deletados`)
        }
      }
    }

    const eventIds = pathsToDelete.map(p => p.eventId)
    await supabase.from('events').update({ image_url: null }).in('id', eventIds)
    console.log(`   ✅ image_url limpo para ${eventIds.length} eventos no banco`)
  } else if (DRY_RUN) {
    console.log(`   (dry run - nenhum arquivo deletado)`)
  }
}

const { count: futureCount } = await supabase
  .from('events')
  .select('*', { count: 'exact', head: true })
  .gte('start_datetime', cutoffDate.toISOString())
  .like('image_url', '%supabase%')

console.log(`\n   📅 Eventos futuros/recentes com imagens mantidas: ${futureCount || 0}`)

// ─── PARTE 2: Instagram Stories antigos (instagram-stories) ──────────────────
console.log('\n📌 PARTE 2: instagram-stories (stories gerados)')
console.log('-'.repeat(60))

const { data: stories, error: storiesError } = await supabase.storage
  .from('instagram-stories')
  .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } })

if (storiesError) {
  console.log(`   ⚠️  Erro ao listar: ${storiesError.message}`)
} else {
  const oldStories = stories.filter(f => {
    const createdAt = new Date(f.created_at || 0)
    return createdAt < cutoffDate
  })

  const totalSize = stories.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)
  const oldSize = oldStories.reduce((sum, f) => sum + (f.metadata?.size || 0), 0)

  console.log(`   Total de stories: ${stories.length} (${(totalSize/1024/1024).toFixed(1)} MB)`)
  console.log(`   Stories com +${DAYS_BUFFER} dias: ${oldStories.length} (${(oldSize/1024/1024).toFixed(1)} MB para deletar)`)

  if (oldStories.length > 0 && !DRY_RUN) {
    const paths = oldStories.map(f => f.name)
    const batchSize = 100
    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize)
      const { error: deleteError } = await supabase.storage.from('instagram-stories').remove(batch)
      if (deleteError) {
        console.error(`   ❌ Erro ao deletar stories: ${deleteError.message}`)
      } else {
        totalDeleted += batch.length
        console.log(`   ✅ ${batch.length} stories deletados`)
      }
    }
  } else if (DRY_RUN) {
    console.log(`   (dry run - nenhum arquivo deletado)`)
  }
}

// ─── RESUMO FINAL ─────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`)
console.log(`✅ CONCLUÍDO:`)
if (!DRY_RUN) console.log(`   Total deletado: ${totalDeleted} arquivos`)
console.log(`\nSupabase Storage: https://supabase.com/dashboard/project/ssxowzurrtyzmracmusn/storage/buckets`)
