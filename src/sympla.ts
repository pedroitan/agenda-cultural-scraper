import { z } from 'zod'

import type { EventInput, ScraperInput } from './types.js'

// Schema for Sympla's __NEXT_DATA__ JSON embedded in HTML
const SymplaItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String).optional(),
    name: z.string().optional(),
    title: z.string().optional(), // alternative field name
    start_date: z.string().optional(),
    startDate: z.string().optional(), // alternative field name
    url: z.string().optional(),
    link: z.string().optional(), // alternative field name
    image: z.string().optional(),
    imageUrl: z.string().optional(), // alternative field name
    city: z.string().optional(),
    location: z.string().optional(), // alternative field name
    venue: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
    venueName: z.string().optional(), // alternative field name
    min_price: z.number().optional(),
    minPrice: z.number().optional(), // alternative field name
    price: z.string().optional(),
    is_free: z.boolean().optional(),
    isFree: z.boolean().optional(), // alternative field name
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

async function fetchHtmlWithRetry(url: string, headers: Record<string, string>) {
  const timeoutMs = envNumber('REQUEST_TIMEOUT_MS', 15000)
  const retryMax = envNumber('RETRY_MAX', 3)

  for (let attempt = 1; attempt <= retryMax; attempt++) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, { headers, signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } finally {
      clearTimeout(id)
    }
  }
  throw new Error('Unreachable')
}

function extractNextData(html: string): any {
  // Extract __NEXT_DATA__ JSON from the HTML page
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function findEventsInObject(obj: any, events: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return events
  
  // Look for arrays that might contain events
  if (Array.isArray(obj)) {
    // Check if this array contains event-like objects
    if (obj.length > 0 && obj[0] && (obj[0].name || obj[0].title) && (obj[0].url || obj[0].link || obj[0].id)) {
      events.push(...obj)
    } else {
      for (const item of obj) {
        findEventsInObject(item, events)
      }
    }
  } else {
    // Check common keys that might contain events
    for (const key of ['events', 'items', 'data', 'results', 'list']) {
      if (obj[key]) {
        findEventsInObject(obj[key], events)
      }
    }
    // Recurse into pageProps
    if (obj.pageProps) {
      findEventsInObject(obj.pageProps, events)
    }
    if (obj.props) {
      findEventsInObject(obj.props, events)
    }
  }
  return events
}

export async function runSymplaScrape(input: ScraperInput): Promise<SymplaScrapeResult> {
  const requestDelayMs = envNumber('REQUEST_DELAY_MS', 1000)

  const valid: EventInput[] = []
  let invalid_count = 0
  let items_fetched = 0

  const headers: Record<string, string> = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  }

  // Scrape the main events page for Salvador
  const categories = ['show-musica-festa', 'teatro-espetaculos', 'gastronomia', 'cursos-workshops']
  
  for (const category of categories) {
    const url = `https://www.sympla.com.br/eventos/salvador-ba/${category}`
    console.log(`Fetching: ${url}`)
    
    try {
      const html = await fetchHtmlWithRetry(url, headers)
      
      // Try to extract __NEXT_DATA__
      const nextData = extractNextData(html)
      if (nextData) {
        const events = findEventsInObject(nextData)
        console.log(`Found ${events.length} events in __NEXT_DATA__ for ${category}`)
        items_fetched += events.length
        
        for (const item of events) {
          const e = normalizeEvent(item, input)
          if (!e) {
            invalid_count++
            continue
          }
          valid.push(e)
        }
      } else {
        // Fallback: extract event links from HTML using regex
        const eventLinks = html.match(/href="(https:\/\/(?:www\.sympla\.com\.br\/evento\/[^"]+|bileto\.sympla\.com\.br\/event\/[^"]+))"/g) || []
        const uniqueLinks = [...new Set(eventLinks.map(l => l.replace(/href="|"/g, '')))]
        console.log(`Found ${uniqueLinks.length} event links in HTML for ${category}`)
        
        for (const link of uniqueLinks) {
          // Extract event ID from URL
          const idMatch = link.match(/\/evento\/[^/]+-(\d+)$/) || link.match(/\/event\/(\d+)/)
          if (idMatch) {
            const eventId = idMatch[1]
            const event: EventInput = {
              source: input.source,
              external_id: eventId,
              title: `Event ${eventId}`, // Will be updated when we fetch details
              start_datetime: new Date().toISOString(), // Placeholder
              city: input.city,
              url: link,
              is_free: false,
              raw_payload: { link },
            }
            valid.push(event)
            items_fetched++
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching ${category}:`, err)
    }
    
    await delay(requestDelayMs)
  }

  // Deduplicate by external_id
  const seen = new Set<string>()
  const dedupedValid = valid.filter(e => {
    if (seen.has(e.external_id)) return false
    seen.add(e.external_id)
    return true
  })

  return { valid: dedupedValid, invalid_count, items_fetched }
}
