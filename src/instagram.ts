import { EventInput, ScraperInput } from './types.js'

interface InstagramEvent {
  projeto?: string
  atracoes?: string
  local?: string
  quanto?: string
  horario?: string
}

const MONTH_MAP: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
}

function extractDateFromTitle(text: string): Date | null {
  // Extract: "16 de Janeiro" or "Sexta, 16 de Janeiro"
  const match = text.match(/(\d{1,2})\s+de\s+(\w+)/i)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const monthName = match[2].toLowerCase()
  const month = MONTH_MAP[monthName]
  
  if (month === undefined) return null

  const year = new Date().getFullYear()
  return new Date(year, month, day)
}

function parseEventBlock(block: string, baseDate: Date): InstagramEvent | null {
  const lines = block.trim().split('\n').filter(l => l.trim())
  if (lines.length === 0) return null

  const event: InstagramEvent = {}

  for (const line of lines) {
    const cleaned = line.trim()
    
    // Projeto: X
    if (/^Projeto:/i.test(cleaned)) {
      event.projeto = cleaned.replace(/^Projeto:\s*/i, '').trim()
    }
    // Atrações: X or Atração: X
    else if (/^Atra[çc][õo](?:es)?:/i.test(cleaned)) {
      event.atracoes = cleaned.replace(/^Atra[çc][õo](?:es)?:\s*/i, '').trim()
    }
    // Local: X
    else if (/^Local:/i.test(cleaned)) {
      event.local = cleaned.replace(/^Local:\s*/i, '').trim()
    }
    // Quanto: X
    else if (/^Quanto:/i.test(cleaned)) {
      event.quanto = cleaned.replace(/^Quanto:\s*/i, '').trim()
    }
    // Horário: X or Horario: X
    else if (/^Hor[áa]rio:/i.test(cleaned)) {
      event.horario = cleaned.replace(/^Hor[áa]rio:\s*/i, '').trim()
    }
  }

  // Must have at least atracoes or projeto
  if (!event.atracoes && !event.projeto) return null

  return event
}

function parseTime(timeStr: string): string {
  // "20h" -> "20:00"
  // "19h30" -> "19:30"
  // "8h" -> "08:00"
  const match = timeStr.match(/(\d{1,2})h(\d{2})?/)
  if (!match) return '20:00' // Default

  const hour = match[1].padStart(2, '0')
  const minute = match[2] || '00'
  return `${hour}:${minute}`
}

function parsePrice(priceStr: string): { is_free: boolean; price_text: string | null } {
  const lower = priceStr.toLowerCase()
  
  if (lower.includes('gratuito') || lower.includes('grátis') || lower.includes('free')) {
    return { is_free: true, price_text: null }
  }
  
  if (lower.includes('sympla')) {
    return { is_free: false, price_text: 'Ver Sympla' }
  }
  
  return { is_free: false, price_text: priceStr }
}

function buildEventInput(parsed: InstagramEvent, baseDate: Date, postUrl: string): EventInput | null {
  // Build title
  const title = parsed.projeto || parsed.atracoes || 'Evento'
  
  // Build datetime
  const time = parsed.horario ? parseTime(parsed.horario) : '20:00'
  const [hour, minute] = time.split(':')
  const eventDate = new Date(baseDate)
  eventDate.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0)
  const start_datetime = eventDate.toISOString().replace('Z', '').slice(0, 19)

  // Parse price
  const { is_free, price_text } = parsed.quanto 
    ? parsePrice(parsed.quanto)
    : { is_free: false, price_text: null }

  // Build external_id (hash of title + date + venue)
  const idString = `${title}-${start_datetime}-${parsed.local || ''}`
  const external_id = `instagram-${Buffer.from(idString).toString('base64').slice(0, 32)}`

  return {
    external_id,
    source: 'instagram',
    city: 'Salvador',
    title,
    start_datetime,
    venue_name: parsed.local || undefined,
    image_url: undefined,
    url: postUrl,
    price_text: price_text || undefined,
    is_free,
    category: 'Shows e Festas',
    raw_payload: parsed,
  }
}

export function parseInstagramPost(postText: string, postUrl: string): EventInput[] {
  const events: EventInput[] = []

  // Extract date from title
  const baseDate = extractDateFromTitle(postText)
  if (!baseDate) {
    console.warn('Could not extract date from Instagram post title')
    return []
  }

  // Split by separator lines
  const blocks = postText.split(/_{5,}|─{5,}/).filter(b => b.trim())

  // Process all blocks (including first one which may contain title + first event)
  for (const block of blocks) {
    // Check if block contains title (has ♫ or #)
    if (block.includes('♫') || block.includes('#')) {
      // Try to extract event from this block too (after the title line)
      const lines = block.split('\n')
      const eventStartIndex = lines.findIndex(l => 
        /^(Projeto:|Atra[çc][õo](?:es)?:|Local:)/i.test(l.trim())
      )
      
      if (eventStartIndex > 0) {
        // There's an event after the title in this block
        const eventText = lines.slice(eventStartIndex).join('\n')
        const parsed = parseEventBlock(eventText, baseDate)
        if (parsed) {
          const eventInput = buildEventInput(parsed, baseDate, postUrl)
          if (eventInput) events.push(eventInput)
        }
      }
      continue
    }

    // Regular event block
    const parsed = parseEventBlock(block, baseDate)
    if (!parsed) continue

    const eventInput = buildEventInput(parsed, baseDate, postUrl)
    if (eventInput) events.push(eventInput)
  }

  console.log(`Parsed ${events.length} events from Instagram post`)
  return events
}

export interface InstagramScrapeResult {
  valid: EventInput[]
  invalid_count: number
  items_fetched: number
}

export async function runInstagramScrape(input: ScraperInput): Promise<InstagramScrapeResult> {
  console.log('Instagram scraper not yet implemented - use parseInstagramPost() directly')
  
  return {
    valid: [],
    invalid_count: 0,
    items_fetched: 0,
  }
}
