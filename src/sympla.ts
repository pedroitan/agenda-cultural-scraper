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

function extractEventFromHtml(html: string, eventId: string, url: string, input: ScraperInput): EventInput | null {
  // Try to extract event data from __NEXT_DATA__ in the event page
  const nextData = extractNextData(html)
  if (nextData) {
    // Look for event data in pageProps
    const pageProps = nextData?.props?.pageProps
    const eventData = pageProps?.event || pageProps?.data || pageProps
    
    if (eventData && (eventData.name || eventData.title)) {
      const title = eventData.name || eventData.title
      const startDate = eventData.start_date || eventData.startDate || eventData.date
      const venueName = eventData.venue?.name || eventData.venueName || eventData.location?.name || eventData.address?.name
      const imageUrl = eventData.image || eventData.imageUrl || eventData.banner || eventData.cover
      const isFree = eventData.is_free || eventData.isFree || eventData.free || false
      const price = eventData.price || eventData.price_text || eventData.priceText
      
      if (title && startDate) {
        return {
          source: input.source,
          external_id: eventId,
          title,
          start_datetime: startDate,
          city: input.city,
          venue_name: venueName,
          image_url: imageUrl,
          is_free: Boolean(isFree),
          price_text: price,
          url,
          raw_payload: eventData,
        }
      }
    }
  }
  
  // Fallback: extract from meta tags and structured data
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/) ||
                     html.match(/<title>([^<]+)<\/title>/)
  const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
  const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
  
  // Try to find date from structured data or text
  const dateMatch = html.match(/(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\s+(?:de\s+)?(\d{4})?/i) ||
                    html.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  
  // Try to find venue
  const venueMatch = html.match(/<[^>]*class="[^"]*venue[^"]*"[^>]*>([^<]+)</) ||
                     html.match(/<[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)</)
  
  const title = titleMatch ? titleMatch[1].replace(/ - Sympla$| \| Sympla$/i, '').trim() : null
  
  if (!title) return null
  
  // Parse date
  let startDatetime: string
  if (dateMatch) {
    if (dateMatch[0].includes('T')) {
      startDatetime = dateMatch[0]
    } else {
      const months: Record<string, string> = {
        jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
        jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12'
      }
      const day = dateMatch[1].padStart(2, '0')
      const month = months[dateMatch[2].toLowerCase().slice(0, 3)]
      const year = dateMatch[3] || new Date().getFullYear().toString()
      startDatetime = `${year}-${month}-${day}T19:00:00`
    }
  } else {
    // Default to 30 days from now if no date found
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    startDatetime = futureDate.toISOString()
  }
  
  return {
    source: input.source,
    external_id: eventId,
    title,
    start_datetime: startDatetime,
    city: input.city,
    venue_name: venueMatch ? venueMatch[1].trim() : undefined,
    image_url: imageMatch ? imageMatch[1] : undefined,
    is_free: false,
    url,
    raw_payload: { title, dateMatch: dateMatch?.[0], venueMatch: venueMatch?.[1] },
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
  const requestDelayMs = envNumber('REQUEST_DELAY_MS', 800)
  const maxEventsTarget = envNumber('MAX_EVENTS', 100)

  const valid: EventInput[] = []
  let invalid_count = 0
  let items_fetched = 0
  const collectedLinks = new Set<string>()

  const headers: Record<string, string> = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  }

  // Extended categories to get more events
  const categories = [
    'show-musica-festa',
    'teatro-espetaculos', 
    'gastronomia',
    'cursos-workshops',
    'congressos-palestras',
    'esportes',
    'infantil',
    'religiao-espiritualidade',
    'passeios-tours',
    '', // All events (no category filter)
  ]

  console.log(`Target: ${maxEventsTarget} events`)

  // Phase 1: Collect all event links from category pages
  for (const category of categories) {
    if (collectedLinks.size >= maxEventsTarget * 2) break // Collect extra to account for duplicates
    
    const baseUrl = category 
      ? `https://www.sympla.com.br/eventos/salvador-ba/${category}`
      : `https://www.sympla.com.br/eventos/salvador-ba`
    
    // Try multiple pages per category
    for (let page = 1; page <= 5; page++) {
      if (collectedLinks.size >= maxEventsTarget * 2) break
      
      const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`
      console.log(`Fetching listing: ${url}`)
      
      try {
        const html = await fetchHtmlWithRetry(url, headers)
        
        // Extract all event links from the page
        const symplaLinks = html.match(/href="(https:\/\/www\.sympla\.com\.br\/evento\/[^"]+)"/g) || []
        const biletoLinks = html.match(/href="(https:\/\/bileto\.sympla\.com\.br\/event\/[^"]+)"/g) || []
        
        const allLinks = [...symplaLinks, ...biletoLinks]
          .map(l => l.replace(/href="|"/g, ''))
          .filter(l => !l.includes('?') || l.includes('event')) // Filter out query params except event pages
        
        const newLinks = allLinks.filter(l => !collectedLinks.has(l))
        newLinks.forEach(l => collectedLinks.add(l))
        
        console.log(`  Found ${newLinks.length} new links (total: ${collectedLinks.size})`)
        
        // If no new links found, move to next category
        if (newLinks.length === 0) break
        
        await delay(requestDelayMs)
      } catch (err) {
        console.error(`Error fetching ${url}:`, err)
        break
      }
    }
  }

  console.log(`\nCollected ${collectedLinks.size} unique event links. Fetching details...`)

  // Phase 2: Fetch details for each event (limit to target)
  const linksToFetch = Array.from(collectedLinks).slice(0, maxEventsTarget + 20) // Extra buffer
  
  for (const link of linksToFetch) {
    if (valid.length >= maxEventsTarget) {
      console.log(`Reached target of ${maxEventsTarget} valid events`)
      break
    }
    
    // Extract event ID from URL
    const idMatch = link.match(/\/evento\/[^/]*-(\d+)(?:\?|$)/) || 
                    link.match(/\/evento\/(\d+)/) ||
                    link.match(/\/event\/(\d+)/)
    if (!idMatch) {
      console.log(`Could not extract ID from: ${link}`)
      invalid_count++
      continue
    }
    
    const eventId = idMatch[1]
    items_fetched++
    
    try {
      console.log(`[${valid.length + 1}/${maxEventsTarget}] Fetching: ${link}`)
      const eventHtml = await fetchHtmlWithRetry(link, headers)
      const eventData = extractEventFromHtml(eventHtml, eventId, link, input)
      
      if (eventData && eventData.title && !eventData.title.includes('Sympla - Ingressos')) {
        // Validate we have real data, not generic page title
        valid.push(eventData)
        console.log(`  ✓ ${eventData.title.slice(0, 50)}...`)
      } else {
        console.log(`  ✗ Invalid or generic data`)
        invalid_count++
      }
      
      await delay(300) // Faster delay for individual pages
    } catch (err) {
      console.error(`  ✗ Error: ${err}`)
      invalid_count++
    }
  }

  // Deduplicate by external_id (in case of duplicates)
  const seen = new Set<string>()
  const dedupedValid = valid.filter(e => {
    if (seen.has(e.external_id)) return false
    seen.add(e.external_id)
    return true
  })

  console.log(`\nScrape complete: ${dedupedValid.length} valid, ${invalid_count} invalid, ${items_fetched} fetched`)

  return { valid: dedupedValid, invalid_count, items_fetched }
}
