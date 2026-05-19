import * as cheerio from 'cheerio'
import type { EventInput, ScraperInput } from './types.js'

type SalvadorScraperResult = {
  valid: EventInput[]
  invalid_count: number
  items_fetched: number
}

const BASE_URL = 'https://www.salvadordabahia.com'
const AGENDA_URL = `${BASE_URL}/agenda/`

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const MONTHS: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', marco: '03',
  abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09',
  outubro: '10', novembro: '11', dezembro: '12',
}

// Matches accented month names: março, junho, etc.
const MONTH_PATTERN = '[a-z\u00e0-\u00fc]+'

// Parse "10 de março de 2026" or "de 10 de março a 28 de junho de 2026"
function parseDateRange(dateStr: string): { start: string | null; end: string | null } {
  const clean = dateStr.trim().toLowerCase()

  // Range com ou sem "de" no início: "de DD de MÊS a DD de MÊS" ou "DD de MÊS a DD de MÊS"
  const rangeRegex = new RegExp(
    `(?:de\\s+)?(\\d{1,2})\\s+de\\s+(${MONTH_PATTERN})(?:\\s+de\\s+(\\d{4}))?\\s+a\\s+(\\d{1,2})\\s+de\\s+(${MONTH_PATTERN})(?:\\s+de\\s+(\\d{4}))?`
  )
  const rangeMatch = clean.match(rangeRegex)
  if (rangeMatch) {
    const year = rangeMatch[6] || rangeMatch[3] || String(new Date().getFullYear())
    const startMonth = MONTHS[rangeMatch[2]]
    const endMonth = MONTHS[rangeMatch[5]]
    if (startMonth && endMonth) {
      return {
        start: `${rangeMatch[3] || year}-${startMonth}-${rangeMatch[1].padStart(2, '0')}T00:00:00`,
        end:   `${rangeMatch[6] || year}-${endMonth}-${rangeMatch[4].padStart(2, '0')}T23:59:59`,
      }
    }
  }

  // Range "entre os dias X e Y de MÊS [de YYYY]"
  const entreRegex = new RegExp(
    `entre\\s+os\\s+dias\\s+(\\d{1,2})\\s+e\\s+(\\d{1,2})\\s+de\\s+(${MONTH_PATTERN})(?:\\s+de\\s+(\\d{4}))?`
  )
  const entreMatch = clean.match(entreRegex)
  if (entreMatch) {
    const month = MONTHS[entreMatch[3]]
    const year = entreMatch[4] || String(new Date().getFullYear())
    if (month) {
      return {
        start: `${year}-${month}-${entreMatch[1].padStart(2, '0')}T00:00:00`,
        end:   `${year}-${month}-${entreMatch[2].padStart(2, '0')}T23:59:59`,
      }
    }
  }

  // Single date: "DD de MÊS de YYYY" or "DD de MÊS"
  const singleRegex = new RegExp(`(\\d{1,2})\\s+de\\s+(${MONTH_PATTERN})(?:\\s+de\\s+(\\d{4}))?`)
  const singleMatch = clean.match(singleRegex)
  if (singleMatch) {
    const month = MONTHS[singleMatch[2]]
    const year = singleMatch[3] || String(new Date().getFullYear())
    if (month) {
      return {
        start: `${year}-${month}-${singleMatch[1].padStart(2, '0')}T00:00:00`,
        end: null,
      }
    }
  }

  return { start: null, end: null }
}

// Parse "das 10h às 18h" or "19h" or "19h30" from horário string
function parseTime(horarioStr: string): string {
  const match = horarioStr.match(/(\d{1,2})h(\d{0,2})/)
  if (match) {
    const hour = match[1].padStart(2, '0')
    const min = match[2] ? match[2].padStart(2, '0') : '00'
    return `${hour}:${min}:00`
  }
  return '00:00:00'
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgendaCulturalBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// Extrair links de eventos de uma página de agenda
function extractEventLinks(html: string): string[] {
  const $ = cheerio.load(html)
  const links: string[] = []

  // Os eventos são links com /eventos/ no href
  $('a[href*="/eventos/"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && !links.includes(href)) {
      links.push(href.startsWith('http') ? href : `${BASE_URL}${href}`)
    }
  })

  return links
}

// Extrair dados de uma página de detalhe de evento
async function scrapeEventDetail(url: string): Promise<EventInput | null> {
  const html = await fetchHtml(url)
  if (!html) return null

  const $ = cheerio.load(html)

  // Título
  const title = $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.replace(' - Salvador da Bahia', '').trim() || ''
  if (!title) return null

  // Imagem (OG é mais confiável)
  const image_url = $('meta[property="og:image"]').attr('content') || undefined

  // Slug para external_id
  const slug = url.replace(/.*\/eventos\//, '').replace(/\/$/, '')

  // Extrair bloco "Serviço" — procurar pelo heading e pegar o container pai
  let serviceText = ''
  $('h2, h3, h4, strong, b, p').each((_, el) => {
    const text = $(el).text().trim()
    if (/^servi[çc]o$/i.test(text)) {
      // Pegar o pai ou o próximo container com o conteúdo
      const parent = $(el).parent()
      serviceText = parent.text()
      if (serviceText.length < 50) {
        // Tentar o próximo sibling
        serviceText = $(el).nextAll().first().text() + parent.text()
      }
    }
  })

  // Fallback: buscar bloco que contenha "Data:" e "Local:"
  if (!serviceText) {
    $('*').each((_, el) => {
      const text = $(el).text()
      if (text.includes('Data:') && text.includes('Local:') && text.length < 3000) {
        serviceText = text
      }
    })
  }

  // Data
  let start_datetime: string | null = null
  const dataMatch = serviceText.match(/data:\s*([^\n\r]+)/i)
  if (dataMatch) {
    const { start } = parseDateRange(dataMatch[1])
    start_datetime = start
  }

  // Horário — combinar com data se encontrado
  const horarioMatch = serviceText.match(/hor[aá]rio[s]?(?:\s+de\s+visita[çc][aã]o)?:\s*([^\n\r]+)/i)
  if (horarioMatch && start_datetime) {
    const time = parseTime(horarioMatch[1])
    start_datetime = start_datetime.replace('T00:00:00', `T${time}`)
  }

  // Fallback 1: campo "Visitação:" pode conter datas
  if (!start_datetime) {
    const visitMatch = serviceText.match(/visita[çc][aã]o:\s*([^\n\r]+)/i)
    if (visitMatch) {
      const { start } = parseDateRange(visitMatch[1])
      start_datetime = start
    }
  }

  // Fallback 2: "Entre os dias X e Y de MÊS" no body
  if (!start_datetime) {
    const bodyText = $('body').text()
    const { start } = parseDateRange(bodyText)
    start_datetime = start
  }

  // Fallback 3: procurar data com ano explícito no body
  if (!start_datetime) {
    const bodyText = $('body').text()
    const monthPat = '[a-záéíóúàâêîôûãõçü]+'
    const dateRegex = new RegExp(`(\\d{1,2})\\s+de\\s+(${monthPat})\\s+de\\s+(\\d{4})`, 'i')
    const dateInBody = bodyText.match(dateRegex)
    if (dateInBody) {
      const { start } = parseDateRange(dateInBody[0])
      start_datetime = start
    }
  }

  if (!start_datetime) return null

  // Venue
  let venue_name: string | undefined
  const localMatch = serviceText.match(/local:\s*([^\n\r]+)/i)
  if (localMatch) {
    venue_name = localMatch[1].trim()
  }

  // Preço / gratuidade
  const serviceTextLower = serviceText.toLowerCase()
  const bodyLower = $('body').text().toLowerCase()
  const is_free =
    serviceTextLower.includes('gratuita') ||
    serviceTextLower.includes('gratuito') ||
    serviceTextLower.includes('entrada gratuita') ||
    bodyLower.includes('entrada gratuita')

  let price_text: string | undefined
  const precoMatch = serviceText.match(/(?:valor|ingresso|entrada|pre[çc]o):\s*([^\n]+)/i)
  if (precoMatch) {
    price_text = precoMatch[1].trim()
  } else if (is_free) {
    price_text = 'Gratuito'
  }

  // Categoria — inferir da URL ou do texto
  let category: string | undefined
  if (bodyLower.includes('exposição') || bodyLower.includes('exposicao')) category = 'Exposição'
  else if (bodyLower.includes('teatro') || bodyLower.includes('espetáculo')) category = 'Teatro'
  else if (bodyLower.includes('música') || bodyLower.includes('show') || bodyLower.includes('concerto')) category = 'Shows e Festas'
  else if (bodyLower.includes('dança') || bodyLower.includes('dance')) category = 'Dança'
  else if (bodyLower.includes('cinema') || bodyLower.includes('filme')) category = 'Cinema'
  else if (bodyLower.includes('gastronomia') || bodyLower.includes('culinária')) category = 'Gastronomia'
  else if (bodyLower.includes('workshop') || bodyLower.includes('oficina') || bodyLower.includes('palestra')) category = 'Cursos'

  return {
    source: 'salvadordabahia',
    external_id: slug,
    title,
    start_datetime,
    city: 'salvador',
    venue_name,
    image_url,
    is_free,
    price_text,
    category,
    url,
    raw_payload: { slug, serviceText: serviceText.slice(0, 500) },
  }
}

export async function runSalvadorDaBahiaScrape(input: ScraperInput): Promise<SalvadorScraperResult> {
  const untilDays = input.untilDays ?? 30
  const seenSlugs = new Set<string>()
  const allLinks: string[] = []

  console.log(`[salvadordabahia] Buscando agenda dos próximos ${untilDays} dias`)

  // Coletar links de hoje + próximos dias
  const today = new Date()
  for (let i = 0; i < untilDays; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD

    const url = i === 0 ? AGENDA_URL : `${AGENDA_URL}?data=${dateStr}`
    console.log(`[salvadordabahia] Agenda ${dateStr}: ${url}`)

    const html = await fetchHtml(url)
    if (!html) {
      console.warn(`[salvadordabahia] Falhou ao buscar ${url}`)
      await delay(1000)
      continue
    }

    const links = extractEventLinks(html)
    console.log(`[salvadordabahia]  → ${links.length} links encontrados`)

    for (const link of links) {
      const slug = link.replace(/.*\/eventos\//, '').replace(/\/$/, '')
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug)
        allLinks.push(link)
      }
    }

    await delay(800)
  }

  console.log(`[salvadordabahia] Total de eventos únicos: ${allLinks.length}`)

  const valid: EventInput[] = []
  let invalid_count = 0

  for (const link of allLinks) {
    console.log(`[salvadordabahia] Scraping: ${link}`)
    const event = await scrapeEventDetail(link)
    if (event) {
      valid.push(event)
      console.log(`[salvadordabahia]  ✓ ${event.title} | ${event.start_datetime}`)
    } else {
      invalid_count++
      console.warn(`[salvadordabahia]  ✗ Sem dados suficientes: ${link}`)
    }
    await delay(600)
  }

  return {
    valid,
    invalid_count,
    items_fetched: allLinks.length,
  }
}
