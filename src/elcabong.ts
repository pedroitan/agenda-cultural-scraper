import type { EventInput, ScraperInput } from './types.js'

type ElCabongScrapeResult = {
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

// Parse date like "11/12/2025 - 21:00" to ISO string
function parseElCabongDate(dateStr: string): string | null {
  // Format: "11/12/2025 - 21:00" or "11/12/2025"
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/)
  if (!match) return null

  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = match[3]
  const hour = match[4] ? match[4].padStart(2, '0') : '20'
  const minute = match[5] || '00'

  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

// Extract events from El Cabong HTML
function extractEventsFromHtml(html: string, input: ScraperInput): EventInput[] {
  const events: EventInput[] = []
  
  // Pattern to match event blocks - El Cabong uses wpem- classes
  // Each event has: title in h3.wpem-heading-text, date in wpem-event-date-time-text, location in wpem-event-location-text
  
  // Find all event links/blocks
  const eventPattern = /<article[^>]*class="[^"]*wpem-event-box[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
  let match

  while ((match = eventPattern.exec(html)) !== null) {
    const eventBlock = match[1]
    
    // Extract title
    const titleMatch = eventBlock.match(/<h3[^>]*class="[^"]*wpem-heading-text[^"]*"[^>]*>([^<]+)<\/h3>/i) ||
                       eventBlock.match(/<h3[^>]*>([^<]+)<\/h3>/i)
    const title = titleMatch ? titleMatch[1].trim() : null
    
    // Extract date/time
    const dateMatch = eventBlock.match(/<span[^>]*class="[^"]*wpem-event-date-time-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    const dateStr = dateMatch ? dateMatch[1].replace(/\s+/g, ' ').trim() : null
    
    // Extract location
    const locationMatch = eventBlock.match(/<span[^>]*class="[^"]*wpem-event-location-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    const location = locationMatch ? locationMatch[1].replace(/\s+/g, ' ').trim() : null
    
    // Extract event URL
    const urlMatch = eventBlock.match(/href="([^"]*elcabong[^"]*evento[^"]*)"/i) ||
                     eventBlock.match(/href="([^"]+)"/i)
    const eventUrl = urlMatch ? urlMatch[1] : null
    
    // Extract image
    const imgMatch = eventBlock.match(/<img[^>]*src="([^"]+)"[^>]*>/i)
    const imageUrl = imgMatch ? imgMatch[1] : undefined

    if (title && dateStr) {
      const startDatetime = parseElCabongDate(dateStr)
      
      if (startDatetime) {
        // Generate a unique ID from title and date
        const externalId = `elcabong-${Buffer.from(title + dateStr).toString('base64').slice(0, 20)}`
        
        events.push({
          source: 'elcabong',
          external_id: externalId,
          title,
          start_datetime: startDatetime,
          city: input.city,
          venue_name: location || undefined,
          image_url: imageUrl,
          category: 'Shows e Festas',
          is_free: false,
          url: eventUrl || 'https://elcabong.com.br/agenda/',
          raw_payload: { title, dateStr, location, eventUrl },
        })
      }
    }
  }

  // Alternative pattern - simpler structure
  if (events.length === 0) {
    // Try to find events with different structure
    const simplePattern = /<h3[^>]*class="[^"]*wpem-heading-text[^"]*"[^>]*>([^<]+)<\/h3>/gi
    const titles: string[] = []
    let titleMatch
    while ((titleMatch = simplePattern.exec(html)) !== null) {
      titles.push(titleMatch[1].trim())
    }

    const datePattern = /<span[^>]*class="[^"]*wpem-event-date-time-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    const dates: string[] = []
    let dateMatch2
    while ((dateMatch2 = datePattern.exec(html)) !== null) {
      dates.push(dateMatch2[1].replace(/\s+/g, ' ').trim())
    }

    const locationPattern = /<span[^>]*class="[^"]*wpem-event-location-text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    const locations: string[] = []
    let locMatch
    while ((locMatch = locationPattern.exec(html)) !== null) {
      locations.push(locMatch[1].replace(/\s+/g, ' ').trim())
    }

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i]
      const dateStr = dates[i] || ''
      const location = locations[i] || ''
      
      const startDatetime = parseElCabongDate(dateStr)
      if (startDatetime) {
        const externalId = `elcabong-${Buffer.from(title + dateStr).toString('base64').slice(0, 20)}`
        
        events.push({
          source: 'elcabong',
          external_id: externalId,
          title,
          start_datetime: startDatetime,
          city: input.city,
          venue_name: location || undefined,
          category: 'Shows e Festas',
          is_free: false,
          url: 'https://elcabong.com.br/agenda/',
          raw_payload: { title, dateStr, location },
        })
      }
    }
  }

  return events
}

export async function runElCabongScrape(input: ScraperInput): Promise<ElCabongScrapeResult> {
  const requestDelayMs = envNumber('REQUEST_DELAY_MS', 800)

  const valid: EventInput[] = []
  let invalid_count = 0
  let items_fetched = 0
  const seenIds = new Set<string>()

  const headers: Record<string, string> = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  }

  console.log('Scraping El Cabong agenda...')

  // Fetch main agenda page
  const url = 'https://elcabong.com.br/agenda/'
  console.log(`Fetching: ${url}`)

  try {
    const html = await fetchHtmlWithRetry(url, headers)
    const events = extractEventsFromHtml(html, input)

    for (const ev of events) {
      if (seenIds.has(ev.external_id)) continue
      seenIds.add(ev.external_id)
      valid.push(ev)
      items_fetched++
    }

    console.log(`  Extracted ${events.length} events from El Cabong`)

    // Try pagination if exists
    for (let page = 2; page <= 10; page++) {
      await delay(requestDelayMs)
      
      const pageUrl = `https://elcabong.com.br/agenda/page/${page}/`
      console.log(`Fetching: ${pageUrl}`)
      
      try {
        const pageHtml = await fetchHtmlWithRetry(pageUrl, headers)
        const pageEvents = extractEventsFromHtml(pageHtml, input)
        
        let newCount = 0
        for (const ev of pageEvents) {
          if (seenIds.has(ev.external_id)) continue
          seenIds.add(ev.external_id)
          valid.push(ev)
          items_fetched++
          newCount++
        }
        
        console.log(`  Page ${page}: ${newCount} new events`)
        
        if (newCount === 0) break
      } catch (err) {
        // No more pages
        break
      }
    }
  } catch (err) {
    console.error(`Error fetching El Cabong:`, err)
    invalid_count++
  }

  console.log(`\nEl Cabong scrape complete: ${valid.length} valid, ${invalid_count} invalid`)

  return { valid, invalid_count, items_fetched }
}
