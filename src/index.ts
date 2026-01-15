import 'dotenv/config'

import { z } from 'zod'

import { runSymplaScrape } from './sympla.js'
import { runElCabongScrape } from './elcabong.js'
import { supabase } from './supabase.js'
import type { EventInput, ScrapeRunInsert, ScraperInput } from './types.js'

const EnvSchema = z.object({
  SCRAPE_CITY: z.literal('salvador').default('salvador'),
  SCRAPE_UNTIL_DAYS: z.coerce.number().int().positive().default(90),
})

type RunMetrics = {
  items_fetched: number
  items_valid: number
  items_invalid: number
  items_upserted: number
}

async function createRun(source: string, city: string) {
  const insert: ScrapeRunInsert = { source, city, status: 'running' }
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

  const { error } = await supabase.from('events').upsert(events, {
    onConflict: 'source,external_id',
    ignoreDuplicates: false,
  })

  if (error) throw error
  return events.length
}

async function main() {
  const env = EnvSchema.parse(process.env)
  const city = env.SCRAPE_CITY

  // Run all scrapers
  const scrapers = [
    { name: 'sympla', run: runSymplaScrape },
    { name: 'elcabong', run: runElCabongScrape },
  ]

  for (const scraper of scrapers) {
    const input: ScraperInput = {
      source: scraper.name as 'sympla' | 'elcabong',
      city,
      untilDays: env.SCRAPE_UNTIL_DAYS,
    }

    const run = await createRun(input.source, input.city)
    const metrics: RunMetrics = {
      items_fetched: 0,
      items_valid: 0,
      items_invalid: 0,
      items_upserted: 0,
    }

    try {
      console.log(`\n========== Starting ${scraper.name} scraper ==========\n`)
      const result = await scraper.run(input)
      metrics.items_fetched = result.items_fetched
      metrics.items_valid = result.valid.length
      metrics.items_invalid = result.invalid_count

      metrics.items_upserted = await upsertEvents(result.valid)

      await finalizeRun(run.id, 'success', metrics)
      console.log(JSON.stringify({ level: 'info', msg: 'scrape_success', source: scraper.name, runId: run.id, ...metrics }))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await finalizeRun(run.id, 'failed', metrics, message)
      console.error(JSON.stringify({ level: 'error', msg: 'scrape_failed', source: scraper.name, runId: run.id, error: message }))
    }
  }
}

await main()
