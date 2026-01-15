import { z } from 'zod'

import type { EventInput, ScraperInput } from './types.js'

const SymplaItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String).optional(),
    name: z.string().optional(),
    start_date: z.string().optional(),
    url: z.string().optional(),
    image: z.string().optional(),
    city: z.string().optional(),
    venue: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
    min_price: z.number().optional(),
    price: z.string().optional(),
    is_free: z.boolean().optional(),
  })
  .passthrough()

type SymplaScrapeResult = {
  valid: EventInput[]
  invalid_count: number
  items_fetched: number
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function envNumber(name: string, fallback: number) {
  const v = process.env[name]
  if (!v) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function isWithinWindow(startIso: string, untilDays: number) {
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return false

  const now = new Date()
  const until = new Date(now.getTime() + untilDays * 24 * 60 * 60 * 1000)

  return start >= now && start <= until
}

function normalizeEvent(item: unknown, input: ScraperInput): EventInput | null {
  const parsed = SymplaItemSchema.safeParse(item)
  if (!parsed.success) return null

  const data = parsed.data
  const external_id = data.id
  const title = data.name
  const start_datetime = data.start_date
  const url = data.url

  if (!external_id || !title || !start_datetime || !url) return null
  if (!isWithinWindow(start_datetime, input.untilDays ?? 90)) return null

  const is_free = Boolean(data.is_free)
  const min_price = typeof data.min_price === 'number' ? Math.round(data.min_price) : undefined
  const price_text = data.price ?? (is_free ? 'Gratuito' : 'Consulte')

  return {
    source: input.source,
    external_id,
    title,
    start_datetime,
    city: input.city,
    venue_name: data.venue?.name,
    image_url: data.image,
    is_free,
    min_price,
    price_text,
    url,
    raw_payload: data,
  }
}

async function fetchJsonWithRetry(url: string, init: RequestInit) {
  const timeoutMs = envNumber('REQUEST_TIMEOUT_MS', 15000)
  const retryMax = envNumber('RETRY_MAX', 3)
  const retry429DelayMs = envNumber('RETRY_429_DELAY_MS', 60000)

  for (let attempt = 1; attempt <= retryMax; attempt++) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      if (res.status === 429) {
        if (attempt === retryMax) {
          throw new Error(`HTTP 429 after ${retryMax} attempts`)
        }
        await delay(retry429DelayMs)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } finally {
      clearTimeout(id)
    }
  }

  throw new Error('Unreachable')
}

export async function runSymplaScrape(input: ScraperInput): Promise<SymplaScrapeResult> {
  const requestDelayMs = envNumber('REQUEST_DELAY_MS', 1000)
  const maxPages = envNumber('MAX_PAGES', 30)

  const valid: EventInput[] = []
  let invalid_count = 0
  let items_fetched = 0

  const headers: Record<string, string> = {
    'user-agent': 'Mozilla/5.0',
    accept: 'application/json,text/plain,*/*',
  }

  for (let page = 1; page <= maxPages; page++) {
    // Sympla search API endpoint (used by their frontend)
    const url = `https://www.sympla.com.br/api/v4/search?city=salvador&page=${page}&size=20&order_by=date`

    const json = await fetchJsonWithRetry(url, { headers })

    // v4 API returns { data: { events: [...] } } or { events: [...] } or { data: [...] }
    const jsonAny = json as any
    const items = 
      Array.isArray(jsonAny?.data?.events) ? jsonAny.data.events :
      Array.isArray(jsonAny?.events) ? jsonAny.events :
      Array.isArray(jsonAny?.data) ? jsonAny.data :
      Array.isArray(jsonAny) ? jsonAny :
      null
    
    if (!items) {
      console.log('API response structure:', JSON.stringify(json).slice(0, 500))
      throw new Error('Unexpected response shape from Sympla API')
    }

    if (items.length === 0) break

    items_fetched += items.length

    for (const item of items) {
      const e = normalizeEvent(item, input)
      if (!e) {
        invalid_count++
        continue
      }
      valid.push(e)
    }

    await delay(requestDelayMs)
  }

  return { valid, invalid_count, items_fetched }
}
