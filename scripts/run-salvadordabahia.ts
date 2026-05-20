import 'dotenv/config'

import { z } from 'zod'
import { runSalvadorDaBahiaScrape } from './src/salvadordabahia.js'
import { supabase } from './src/supabase.js'
import type { EventInput, ScrapeRunInsert, ScraperInput } from './src/types.js'

const EnvSchema = z.object({
  SCRAPE_CITY: z.enum(['salvador']).default('salvador'),
})

type RunMetrics = {
  items_fetched: number
  items_valid: number
  items_invalid: number
  items_upserted: number
}

async function createRun(source: string, city: string) {
  const insert: ScrapeRunInsert = {
    source,
    city,
    status: 'running',
    started_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('scrape_runs')
    .insert(insert)
    .select('*')
    .single()

  if (error) throw error
  return data as { id: string }
}

async function finalizeRun(
  runId: string,
  status: 'success' | 'failed',
  metrics: Partial<RunMetrics>,
  errorMessage?: string
) {
  const { error } = await supabase
    .from('scrape_runs')
    .update({
      status,
      ended_at: new Date().toISOString(),
      items_fetched: metrics.items_fetched ?? 0,
      items_valid: metrics.items_valid ?? 0,
      items_invalid: metrics.items_invalid ?? 0,
      items_upserted: metrics.items_upserted ?? 0,
      error_message: errorMessage ?? null,
    })
    .eq('id', runId)

  if (error) throw error
}

async function upsertEvents(events: EventInput[]) {
  if (events.length === 0) return 0

  const { error } = await supabase
    .from('events')
    .upsert(events, { onConflict: 'source,external_id', ignoreDuplicates: false })

  if (error) throw error
  return events.length
}

async function main() {
  const env = EnvSchema.parse(process.env)
  const city = env.SCRAPE_CITY

  const input: ScraperInput = {
    source: 'salvadordabahia' as any,
    city,
  }

  const run = await createRun('salvadordabahia', city)
  const metrics: RunMetrics = {
    items_fetched: 0,
    items_valid: 0,
    items_invalid: 0,
    items_upserted: 0,
  }

  try {
    console.log(`\n========== Starting SalvadorDaBahia scraper for ${city} ==========\n`)
    const result = await runSalvadorDaBahiaScrape(input)
    metrics.items_fetched = result.items_fetched
    metrics.items_valid = result.valid.length
    metrics.items_invalid = result.invalid_count

    metrics.items_upserted = await upsertEvents(result.valid)

    await finalizeRun(run.id, 'success', metrics)
    console.log(JSON.stringify({ level: 'info', msg: 'scrape_success', source: 'salvadordabahia', runId: run.id, ...metrics }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const errorDetails = err instanceof Error ? { message: err.message, stack: err.stack } : err
    await finalizeRun(run.id, 'failed', metrics, message)
    console.error(JSON.stringify({ level: 'error', msg: 'scrape_failed', source: 'salvadordabahia', runId: run.id, error: message, details: errorDetails }))
    throw err
  }
}

main().catch(console.error)

// Linha abaixo apenas para compatibilidade de módulo ESM — remover se causar erro
export {}

