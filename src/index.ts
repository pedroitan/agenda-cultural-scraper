/**
 * Agenda Cultural Scraper - Main Entry Point
 * 
 * This script orchestrates all scrapers for the Agenda Cultural Salvador project.
 * It runs scrapers for multiple sources (Sympla, El Cabong, salvadordabahia.com, Instagram)
 * and manages the scrape runs in Supabase for tracking and monitoring.
 * 
 * Environment Variables:
 * - SCRAPE_CITY: Target city ('salvador', 'rio-de-janeiro', 'sao-paulo')
 * - SCRAPE_UNTIL_DAYS: Number of days to scrape into the future (default: 90)
 * - USE_INSTAGRAM_APIFY: Use Apify API for Instagram scraping (default: false)
 * 
 * Usage: npx tsx src/index.ts
 */

import 'dotenv/config'

import { z } from 'zod'

import { runSymplaScrape } from './sympla.js'
import { runElCabongScrape } from './elcabong.js'
import { runSalvadorDaBahiaScrape } from './salvadordabahia.js'
import { runInstagramVisionScrape } from './instagram-vision.js'
import { runInstagramApifyScrape } from './instagram-apify.js'
import { supabase } from './supabase.js'
import type { EventInput, ScrapeRunInsert, ScraperInput } from './types.js'

// Environment variable validation
const EnvSchema = z.object({
  SCRAPE_CITY: z.enum(['salvador', 'rio-de-janeiro', 'sao-paulo']).default('salvador'),
  SCRAPE_UNTIL_DAYS: z.coerce.number().int().positive().default(90),
  USE_INSTAGRAM_APIFY: z.string().optional().transform(v => v === 'true'),
})

// Metrics tracked for each scrape run
type RunMetrics = {
  items_fetched: number
  items_valid: number
  items_invalid: number
  items_upserted: number
}

/**
 * Creates a new scrape run record in Supabase
 * @param source - The scraper source name (sympla, elcabong, etc.)
 * @param city - The target city
 * @returns The created scrape run record with ID
 */
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

/**
 * Finalizes a scrape run with status and metrics
 * @param runId - The scrape run ID
 * @param status - Final status ('success' or 'failed')
 * @param metrics - Scrape metrics
 * @param errorMessage - Error message if failed
 */
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

/**
 * Upserts events to Supabase using external_id for deduplication
 * Updates existing events (image_url, url, title, etc.) instead of creating duplicates
 * @param events - Array of events to upsert
 * @returns Number of events upserted
 */
async function upsertEvents(events: EventInput[]) {
  if (events.length === 0) return 0

  // UPSERT por external_id — atualiza eventos existentes (image_url, url, title, etc.)
  // Resolve problema de eventos antigos com image_url=null nunca serem atualizados
  const { error } = await supabase
    .from('events')
    .upsert(events, { onConflict: 'source,external_id', ignoreDuplicates: false })

  if (error) {
    throw error
  }

  return events.length
}

/**
 * Main function that orchestrates all scrapers
 * Configured by environment variables to target specific city and date range
 */
async function main() {
  const env = EnvSchema.parse(process.env)
  const city = env.SCRAPE_CITY

  // Run all scrapers — elcabong and instagram are Salvador-only
  const scrapers = [
    { name: 'sympla', run: runSymplaScrape, cities: ['salvador', 'rio-de-janeiro', 'sao-paulo'] },
    { name: 'elcabong', run: runElCabongScrape, cities: ['salvador'] },
    { name: 'salvadordabahia', run: runSalvadorDaBahiaScrape, cities: ['salvador'] },
    { 
      name: 'instagram', 
      run: env.USE_INSTAGRAM_APIFY 
        ? runInstagramApifyScrape 
        : (input: ScraperInput) => runInstagramVisionScrape(input, 'agendaalternativasalvador'),
      cities: ['salvador'],
    },
  ].filter(s => s.cities.includes(city))

  for (const scraper of scrapers) {
    const input: ScraperInput = {
      source: scraper.name as 'sympla' | 'elcabong' | 'instagram',
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
      const errorDetails = err instanceof Error ? { message: err.message, stack: err.stack } : err
      await finalizeRun(run.id, 'failed', metrics, message)
      console.error(JSON.stringify({ level: 'error', msg: 'scrape_failed', source: scraper.name, runId: run.id, error: message, details: errorDetails }))
    }
  }
}

await main()
