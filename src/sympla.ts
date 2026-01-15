import type { EventInput, ScraperInput } from './types.js'

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

// Parse Brazilian date format like "Sábado, 17 de Jan às 14:30" or "17 de Janeiro de 2026"
function parseBrazilianDate(dateStr: string): string | null {
  const months: Record<string, string> = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
    janeiro: '01', fevereiro: '02', março: '03', abril: '04', maio: '05', junho: '06',
    julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
  }
  
  // Pattern: "17 de Jan às 14:30" or "Sábado, 17 de Jan às 14:30"
  const match = dateStr.match(/(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?\s*(?:às?\s*(\d{1,2}):(\d{2}))?/i)
  if (!match) return null
  
  const day = match[1].padStart(2, '0')
  const monthKey = match[2].toLowerCase().slice(0, 3)
  const month = months[monthKey]
  if (!month) return null
  
  const year = match[3] || new Date().getFullYear().toString()
  const hour = match[4] ? match[4].padStart(2, '0') : '19'
  const minute = match[5] || '00'
  
  return `${year}-${month}-${day}T${hour}:${minute}:00`
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

async function fetchSymplaSearchApi(city: string, page: number, headers: Record<string, string>): Promise<any[]> {
  // Try Sympla's internal search API endpoints
  const apiUrls = [
    `https://www.sympla.com.br/api/v1/events?city=${city}&page=${page}&limit=50`,
    `https://api.sympla.com.br/public/v3/events?city=${city}&page=${page}&pageSize=50`,
    `https://www.sympla.com.br/_next/data/events/${city}.json?page=${page}`,
  ]
  
  for (const apiUrl of apiUrls) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const res = await fetch(apiUrl, {
        headers: {
          ...headers,
          'accept': 'application/json',
        },
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const json = await res.json()
        const events = json?.data || json?.events || json?.results || (Array.isArray(json) ? json : [])
        if (events.length > 0) {
          console.log(`  API ${apiUrl} returned ${events.length} events`)
          return events
        }
      }
    } catch {
      // Try next API
    }
  }
  
  return []
}

// Extract events directly from listing page HTML using CSS class patterns
function extractEventsFromListingHtml(html: string, input: ScraperInput): EventInput[] {
  const events: EventInput[] = []
  
  // Try to get events from __NEXT_DATA__ first (most reliable)
  const nextData = extractNextData(html)
  if (nextData) {
    const foundEvents = findEventsInObject(nextData)
    console.log(`  Found ${foundEvents.length} events in __NEXT_DATA__`)
    
    for (const ev of foundEvents) {
      const id = ev.id || ev.eventId || ev.slug
      const title = ev.name || ev.title
      const url = ev.url || ev.link || (id ? `https://www.sympla.com.br/evento/${id}` : null)
      const startDate = ev.start_date || ev.startDate || ev.date
      const venue = ev.venue?.name || ev.venueName || ev.location
      const image = ev.image || ev.imageUrl || ev.banner
      const isFree = ev.is_free || ev.isFree || ev.free || false
      const price = ev.price || ev.price_text
      
      if (id && title && url) {
        events.push({
          source: input.source,
          external_id: String(id),
          title,
          start_datetime: startDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          city: input.city,
          venue_name: venue,
          image_url: image,
          is_free: Boolean(isFree),
          price_text: price,
          url,
          raw_payload: ev,
        })
      }
    }
  }
  
  // Extract from HTML patterns using Sympla's CSS classes
  // Title: <h3 class="pn67h1e">TITLE</h3>
  // Date: <div class="qtfy415...">Sexta, 24 de Abr às 19:00</div>
  // Venue: <p class="pn67h1g">VENUE</p>
  
  // Find all event card links with their content
  const cardPattern = /<a[^>]*href="([^"]*(?:\/evento\/|\/event\/)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = cardPattern.exec(html)) !== null) {
    const [, url, cardContent] = match
    if (!url) continue
    
    // Extract title from h3 with class pn67h1e
    const titleMatch = cardContent.match(/<h3[^>]*class="[^"]*pn67h1e[^"]*"[^>]*>([^<]+)<\/h3>/i) ||
                       cardContent.match(/<h3[^>]*>([^<]+)<\/h3>/i)
    const title = titleMatch ? titleMatch[1].trim() : null
    
    // Extract venue from p tag with class pn67h1g
    const venueMatch = cardContent.match(/<p[^>]*class="[^"]*pn67h1g[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                       cardContent.match(/<p[^>]*>([^<]*Salvador[^<]*)<\/p>/i)
    const venue = venueMatch ? venueMatch[1].trim() : undefined
    
    // Extract image URL from img tag - Sympla uses srcset with encoded URLs
    // Try to get from srcset first (better quality), then src
    let imageUrl: string | undefined = undefined
    
    // Pattern 1: Extract from srcset - get the URL inside the _next/image wrapper
    const srcsetMatch = cardContent.match(/srcset="[^"]*url=([^&"]+)/i)
    if (srcsetMatch) {
      // URL is encoded, decode it
      imageUrl = decodeURIComponent(srcsetMatch[1])
    }
    
    // Pattern 2: Extract from src attribute
    if (!imageUrl) {
      const srcMatch = cardContent.match(/<img[^>]*src="([^"]+)"[^>]*>/i)
      if (srcMatch) {
        const srcUrl = srcMatch[1]
        // Check if it's a _next/image URL with encoded original
        const urlParam = srcUrl.match(/url=([^&]+)/)
        if (urlParam) {
          imageUrl = decodeURIComponent(urlParam[1])
        } else {
          imageUrl = srcUrl
        }
      }
    }
    
    // Pattern 3: Try to find direct asset URL
    if (!imageUrl) {
      const assetMatch = cardContent.match(/(https:\/\/assets\.bileto\.sympla\.com\.br[^"'\s]+)/i)
      imageUrl = assetMatch ? assetMatch[1] : undefined
    }
    
    // Clean up image URL if needed
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `https://www.sympla.com.br${imageUrl}`
    }
    
    // Extract date from div with qtfy classes - format: "Sexta, 24 de Abr às 19:00"
    const dateMatch = cardContent.match(/<div[^>]*class="[^"]*qtfy\d+[^"]*"[^>]*>([^<]+)<\/div>/i)
    let dateStr = dateMatch ? dateMatch[1].trim() : null
    
    // Also try to find date pattern anywhere in the content
    if (!dateStr) {
      const datePatternMatch = cardContent.match(/(\w+,\s*\d{1,2}\s+de\s+\w+\s+às?\s*\d{1,2}:\d{2})/i)
      dateStr = datePatternMatch ? datePatternMatch[1].trim() : null
    }
    
    if (title && !title.includes('Sympla')) {
      const idMatch = url.match(/(\d+)(?:\?|$)/)
      if (idMatch) {
        // Parse date string like "Sexta, 24 de Abr às 19:00"
        let startDatetime: string
        if (dateStr) {
          const parsed = parseBrazilianDate(dateStr)
          startDatetime = parsed || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          console.log(`    Date parsed: "${dateStr}" -> ${startDatetime}`)
        } else {
          startDatetime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
        
        events.push({
          source: input.source,
          external_id: idMatch[1],
          title,
          start_datetime: startDatetime,
          city: input.city,
          venue_name: venue,
          image_url: imageUrl,
          is_free: false,
          url: url.startsWith('http') ? url : `https://www.sympla.com.br${url}`,
          raw_payload: { title, venue, dateStr, imageUrl, url },
        })
      }
    }
  }
  
  return events
}

export async function runSymplaScrape(input: ScraperInput): Promise<SymplaScrapeResult> {
  const requestDelayMs = envNumber('REQUEST_DELAY_MS', 800)

  const valid: EventInput[] = []
  let invalid_count = 0
  let items_fetched = 0
  const seenIds = new Set<string>()

  const headers: Record<string, string> = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'referer': 'https://www.sympla.com.br/',
  }

  // Categories based on Sympla's actual URL structure
  const categories = [
    'show-musica-festa',
    'teatro-espetaculo',
    'gastronomico',
    'curso-workshop',
    'congresso-palestra',
    'experiencias',
    'infantil',
    'religioso-espiritual',
    'saude-e-bem-estar',
    'arte-e-cultura',
    'games-e-geek',
    'gratis',
  ]

  console.log(`Scraping ALL events from Salvador...`)

  // Category names in Portuguese
  const categoryNames: Record<string, string> = {
    'show-musica-festa': 'Shows e Festas',
    'teatro-espetaculo': 'Teatro',
    'gastronomico': 'Gastronomia',
    'curso-workshop': 'Cursos',
    'congresso-palestra': 'Palestras',
    'experiencias': 'Experiências',
    'infantil': 'Infantil',
    'religioso-espiritual': 'Religioso',
    'saude-e-bem-estar': 'Bem-estar',
    'arte-e-cultura': 'Arte e Cultura',
    'games-e-geek': 'Games e Geek',
    'gratis': 'Gratuito',
  }

  // Phase 1: Extract events directly from listing pages (with pagination)
  for (const category of categories) {
    const categoryName = categoryNames[category] || category
    
    // Paginate through pages until no new events found
    for (let page = 1; page <= 20; page++) {
      const url = page === 1 
        ? `https://www.sympla.com.br/eventos/salvador-ba/${category}`
        : `https://www.sympla.com.br/eventos/salvador-ba/${category}?page=${page}`
      console.log(`Fetching: ${url}`)
      
      try {
        const html = await fetchHtmlWithRetry(url, headers)
        const events = extractEventsFromListingHtml(html, input)
        
        let newEventsCount = 0
        for (const ev of events) {
          if (seenIds.has(ev.external_id)) continue
          seenIds.add(ev.external_id)
          ev.category = categoryName // Add category
          valid.push(ev)
          items_fetched++
          newEventsCount++
        }
        
        console.log(`  Page ${page}: ${newEventsCount} new events, total: ${valid.length}`)
        
        // Stop pagination if no new events on this page
        if (newEventsCount === 0) break
        
        await delay(requestDelayMs)
      } catch (err) {
        console.error(`Error fetching ${url}:`, err)
        break
      }
    }
  }

  // Phase 2: Also fetch the main Salvador page
  const mainUrl = `https://www.sympla.com.br/eventos/salvador-ba`
  console.log(`Fetching main: ${mainUrl}`)
  
  try {
    const html = await fetchHtmlWithRetry(mainUrl, headers)
    const events = extractEventsFromListingHtml(html, input)
    
    for (const ev of events) {
      if (seenIds.has(ev.external_id)) continue
      seenIds.add(ev.external_id)
      valid.push(ev)
      items_fetched++
    }
    
    console.log(`  Extracted ${events.length} events, total valid: ${valid.length}`)
  } catch (err) {
    console.error(`Error fetching main:`, err)
  }

  // Phase 3: If we still don't have enough events, fetch individual event pages
  // to get more details for events we found
  const eventsNeedingDetails = valid.filter(e => !e.venue_name || e.title.startsWith('Event '))
  console.log(`\n${eventsNeedingDetails.length} events need more details...`)
  
  for (const ev of eventsNeedingDetails.slice(0, 50)) {
    try {
      console.log(`Fetching details: ${ev.url}`)
      const html = await fetchHtmlWithRetry(ev.url, headers)
      const detailed = extractEventFromHtml(html, ev.external_id, ev.url, input)
      
      if (detailed && detailed.title && !detailed.title.includes('Sympla - Ingressos')) {
        // Update the event with better data
        ev.title = detailed.title
        ev.start_datetime = detailed.start_datetime
        ev.venue_name = detailed.venue_name || ev.venue_name
        ev.image_url = detailed.image_url || ev.image_url
        ev.price_text = detailed.price_text || ev.price_text
        console.log(`  ✓ Updated: ${ev.title.slice(0, 40)}...`)
      }
      
      await delay(300)
    } catch (err) {
      console.error(`  ✗ Error: ${err}`)
      invalid_count++
    }
  }

  console.log(`\nScrape complete: ${valid.length} valid, ${invalid_count} invalid, ${items_fetched} fetched`)

  return { valid, invalid_count, items_fetched }
}
