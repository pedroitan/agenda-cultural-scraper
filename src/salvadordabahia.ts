import * as cheerio from 'cheerio'
import type { EventInput, ScraperInput } from './types.js'
import { categorizeEvent } from './utils/categorize.js'

type SalvadorScraperResult = {
  valid: EventInput[]
  invalid_count: number
  items_fetched: number
}

const BASE_URL = 'https://www.salvadordabahia.com'
const AGENDA_URL = `${BASE_URL}/agenda/`
const AJAX_AGENDA_URL = `${BASE_URL}/wp-content/themes/iwwa-salvador-da-bahia/ajax/agenda/card.php`

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
export async function scrapeEventDetail(url: string, input: ScraperInput): Promise<EventInput | null> {
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

  // Extrair dados diretamente de parágrafos que contenham as palavras-chave
  let dataText = ''
  let localText = ''
  let horarioText = ''

  // Procurar parágrafo com "Data:"
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    const dataMatch = text.match(/data:\s*([^\n\r]+)/i)
    if (dataMatch && !dataText) {
      dataText = dataMatch[1].trim()
    }
  })

  // Procurar parágrafo com "Local:"
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    const localMatch = text.match(/local:\s*([^\n\r]+)/i)
    if (localMatch && !localText) {
      localText = localMatch[1].trim()
    }
  })

  // Procurar parágrafo com "Horário" ou "Horários de visitação"
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    const horarioMatch = text.match(/hor[aá]rio[s]?(?:\s+de\s+visita[çc][aã]o)?:\s*([^\n\r]+)/i)
    if (horarioMatch && !horarioText) {
      horarioText = horarioMatch[1].trim()
    }
  })

  // Data
  let start_datetime: string | null = null
  if (dataText) {
    const { start } = parseDateRange(dataText)
    start_datetime = start
  }

  // Fallback 1: campo "Visitação:" pode conter datas
  if (!start_datetime) {
    $('p').each((_, el) => {
      const text = $(el).text().trim()
      const visitMatch = text.match(/visita[çc][aã]o:\s*([^\n\r]+)/i)
      if (visitMatch && !start_datetime) {
        const { start } = parseDateRange(visitMatch[1])
        start_datetime = start
      }
    })
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

  // Aplicar horário — campo "Horário:", tempo embutido no dataText, ou body text
  if (start_datetime.endsWith('T00:00:00')) {
    const timeSource = horarioText || dataText
    const time = parseTime(timeSource)
    if (time !== '00:00:00') {
      start_datetime = start_datetime.replace('T00:00:00', `T${time}`)
    }
  }

  // Venue
  let venue_name: string | undefined = localText || undefined

  // Preço / gratuidade - verificação mais estrita
  let is_free = false
  let price_text: string | undefined

  // Primeiro, procurar preço explícito
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    const precoMatch = text.match(/(?:valor|ingresso|entrada|pre[çc]o):\s*([^\n]+)/i)
    if (precoMatch && !price_text) {
      const priceValue = precoMatch[1].trim().toLowerCase()
      // Se o preço for indicado como gratuito, marca como free
      if (priceValue.includes('gratuito') || priceValue.includes('gratuita') ||
          priceValue.includes('entrada franca') || priceValue.includes('livre') ||
          priceValue.includes('sem custo') || priceValue === 'grátis' ||
          priceValue === 'gratis') {
        is_free = true
        price_text = 'Gratuito'
      } else if (priceValue.match(/^\d+/) || priceValue.includes('r$')) {
        // Se tiver número ou R$, não é gratuito
        price_text = precoMatch[1].trim()
        is_free = false
      } else {
        price_text = precoMatch[1].trim()
      }
    }
  })

  // Se não encontrou preço explícito, verificar no texto de forma mais estrita
  if (!price_text) {
    const bodyLower = $('body').text().toLowerCase()
    // Verificar apenas frases que indiquem gratuidade explícita
    const freePatterns = [
      /entrada\s+gratuita/i,
      /entrada\s+franca/i,
      /gratuito/i,
      /gratuita/i,
      /livre\s+entrada/i,
      /sem\s+custo/i,
      /acesso\s+livre/i,
    ]

    for (const pattern of freePatterns) {
      if (pattern.test(bodyLower)) {
        is_free = true
        price_text = 'Gratuito'
        break
      }
    }
  }

  // Descrição — pegar os parágrafos do conteúdo principal
  let description: string | undefined
  $('.sessao-conteudo .box-content p').each((_, el) => {
    const text = $(el).text().trim()
    // Excluir parágrafos que são metadados (Data:, Local:, etc.)
    if (text.length > 50 && !text.match(/^(data|local|hor[aá]rio|servi[çc]o|entrada|valor):/i)) {
      if (!description) {
        description = text
      } else {
        description += '\n\n' + text
      }
    }
  })

  // Categoria — usar categorização IA para precisão
  const categorization = await categorizeEvent(title, description)
  const category = categorization.category
  const tags = categorization.tags

  // Organizador — procurar por "Organizado por" ou similar
  let organizer: string | undefined
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    const orgMatch = text.match(/organiza[çc][aã]o|organizador|realiza[çc][aã]o|produ[çc][aã]o:\s*([^\n\r]+)/i)
    if (orgMatch && !organizer) {
      organizer = orgMatch[1]?.trim() || text.replace(/organiza[çc][aã]o|organizador|realiza[çc][aã]o|produ[çc][aã]o:\s*/i, '').trim()
    }
  })

  // Atratores/artistas — procurar por "Com", "Com a participação", "Com:"
  let performers: string | undefined
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    const perfMatch = text.match(/(?:com|com a participa[çc][aã]o|atratores|artistas):\s*([^\n\r]+)/i)
    if (perfMatch && !performers) {
      performers = perfMatch[1]?.trim()
    }
  })

  // Duração — procurar por "Duração" ou similar
  let duration: string | undefined
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    const durMatch = text.match(/dura[çc][aã]o:\s*([^\n\r]+)/i)
    if (durMatch && !duration) {
      duration = durMatch[1]?.trim()
    }
  })

  // Classificação etária — procurar por "Classificação", "+18", "Livre"
  let age_restriction: string | undefined
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    if (text.match(/classifica[çc][aã]o:\s*\+?\d+/i)) {
      const ageMatch = text.match(/classifica[çc][aã]o:\s*(\+?\d+)/i)
      if (ageMatch && !age_restriction) {
        age_restriction = ageMatch[1]
      }
    } else if (text.includes('livre') && !age_restriction) {
      age_restriction = 'Livre'
    }
  })

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
    tags,
    url,
    description,
    performers,
    duration,
    age_restriction,
    organizer,
    raw_payload: { slug, dataText, localText, horarioText },
  }
}

// Buscar uma página de eventos via endpoint AJAX
async function fetchAgendaPage(dataInicial: string, dataFinal: string, page: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      data_inicial: dataInicial,
      data_final: dataFinal,
      categ: '',
      page: String(page),
    })
    const res = await fetch(AJAX_AGENDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; AgendaCulturalBot/1.0)',
        'Referer': AGENDA_URL,
        'Origin': BASE_URL,
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function runSalvadorDaBahiaScrape(input: ScraperInput): Promise<SalvadorScraperResult> {
  const seenSlugs = new Set<string>()
  const allLinks: string[] = []

  const today = new Date().toISOString().split('T')[0]
  const futureDate = '2099-12-31'

  console.log(`[salvadordabahia] Buscando todos os eventos via AJAX (de ${today} em diante)`)

  // Página 1 para descobrir o total
  const html1 = await fetchAgendaPage(today, futureDate, 1)
  if (!html1) {
    console.error('[salvadordabahia] Falhou ao buscar página 1')
    return { valid: [], invalid_count: 0, items_fetched: 0 }
  }

  const $1 = cheerio.load(html1)
  const totalPosts = Number($1('[data-total-posts]').first().attr('data-total-posts') || 0)
  const perPage = $1('a[href*="/eventos/"]').length / 2 || 12 // cada link aparece 2x (imagem + título)
  const totalPages = Math.ceil(totalPosts / (perPage || 12))

  console.log(`[salvadordabahia] Total de eventos: ${totalPosts} | ~${totalPages} páginas`)

  // Extrair links da página 1
  const links1 = extractEventLinks(html1)
  for (const link of links1) {
    const slug = link.replace(/.*\/eventos\//, '').replace(/\/$/, '')
    if (!seenSlugs.has(slug)) { seenSlugs.add(slug); allLinks.push(link) }
  }
  console.log(`[salvadordabahia] Página 1: ${links1.length} links → ${seenSlugs.size} únicos`)

  // Páginas 2..N
  for (let page = 2; page <= totalPages; page++) {
    await delay(700)
    const html = await fetchAgendaPage(today, futureDate, page)
    if (!html || html.trim().length < 50) {
      console.log(`[salvadordabahia] Página ${page}: vazia, parando`)
      break
    }
    const links = extractEventLinks(html)
    let newCount = 0
    for (const link of links) {
      const slug = link.replace(/.*\/eventos\//, '').replace(/\/$/, '')
      if (!seenSlugs.has(slug)) { seenSlugs.add(slug); allLinks.push(link); newCount++ }
    }
    console.log(`[salvadordabahia] Página ${page}: ${links.length} links → ${newCount} novos (total: ${allLinks.length})`)
    if (links.length === 0) break
  }

  console.log(`[salvadordabahia] Total de eventos únicos: ${allLinks.length}`)

  const valid: EventInput[] = []
  let invalid_count = 0

  for (const link of allLinks) {
    console.log(`[salvadordabahia] Scraping: ${link}`)
    const event = await scrapeEventDetail(link, input)
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
