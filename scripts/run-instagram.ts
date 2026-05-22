import 'dotenv/config'

import { z } from 'zod'
import { runInstagramVisionScrape } from '../src/instagram-vision.js'
import { runInstagramApifyScrape } from '../src/instagram-apify.js'
import { supabase } from '../src/supabase.js'
import type { EventInput, ScrapeRunInsert, ScraperInput } from '../src/types.js'

/**
 * Instagram Scraper - Run Script
 *
 * Este script suporta dois métodos de scraping do Instagram:
 *
 * 1. INSTAGRAM VISION (USE_INSTAGRAM_APIFY=false):
 *    - Usa Playwright para navegar no Instagram
 *    - Extrai eventos de IMAGENS usando Gemini Vision AI
 *    - NÃO extrai texto do caption
 *    - Requer: GEMINI_API_KEY
 *    - Melhor para: posts com agendas em formato de imagem (stories, carrosséis)
 *
 * 2. INSTAGRAM APIFY (USE_INSTAGRAM_APIFY=true):
 *    - Usa Apify API para buscar posts
 *    - Extrai eventos de TRÊS fontes:
 *      - Caption/texto do post (TextProcessor)
 *      - Imagens (Gemini Vision)
 *      - Mensagens/comentários do autor
 *    - Requer: APIFY_TOKEN + GEMINI_API_KEY
 *    - Melhor para: posts com agendas em texto no caption
 *
 * Variáveis de ambiente:
 * - USE_INSTAGRAM_APIFY: "true" para Apify, "false" para Vision (padrão: false)
 * - GEMINI_API_KEY: Chave do Google Gemini Vision (obrigatório para ambos)
 * - APIFY_TOKEN: Chave do Apify (obrigatório apenas para Apify)
 */

const EnvSchema = z.object({
  SCRAPE_CITY: z.enum(['salvador']).default('salvador'),
  SCRAPE_UNTIL_DAYS: z.coerce.number().int().positive().default(90),
  USE_INSTAGRAM_APIFY: z.string().optional().transform(v => v === 'true'),
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
    source: 'instagram',
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
    console.log(`\n========== Starting Instagram scraper for ${city} ==========\n`)
    const runFn = env.USE_INSTAGRAM_APIFY
      ? runInstagramApifyScrape
      : (input: ScraperInput) => runInstagramVisionScrape(input, 'agendaalternativasalvador')
    
    const result = await runFn(input)
    metrics.items_fetched = result.items_fetched
    metrics.items_valid = result.valid.length
    metrics.items_invalid = result.invalid_count

    metrics.items_upserted = await upsertEvents(result.valid)

    await finalizeRun(run.id, 'success', metrics)
    console.log(JSON.stringify({ level: 'info', msg: 'scrape_success', source: 'instagram', runId: run.id, ...metrics }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const errorDetails = err instanceof Error ? { message: err.message, stack: err.stack } : err
    await finalizeRun(run.id, 'failed', metrics, message)
    console.error(JSON.stringify({ level: 'error', msg: 'scrape_failed', source: 'instagram', runId: run.id, error: message, details: errorDetails }))
    throw err
  }
}

main().catch(console.error)
