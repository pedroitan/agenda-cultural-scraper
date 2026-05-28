import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

let genAI: GoogleGenerativeAI | null = null
let model: any = null

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey)
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
}

export type CategorizationResult = {
  category: string
  tags: string[]
}

const CATEGORIES = [
  'Shows e Festas',
  'Teatro',
  'Arte e Cultura',
  'Gastronomia',
  'Cursos',
  'Palestras',
  'Infantil',
  'Exposições',
  'Festivais',
  'Cinema',
  'Dança',
]

const TAGS_MAP: Record<string, string[]> = {
  'Shows e Festas': ['show', 'música', 'concerto', 'samba', 'pagode', 'rock', 'pop', 'jazz', 'mpb', 'reggae', 'forró', 'axé', 'funk', 'eletrônica', 'banda', 'cantor', 'cantora', 'apresentação'],
  'Teatro': ['teatro', 'peça', 'espetáculo', 'drama', 'comédia', 'monólogo', 'palco', 'cenário'],
  'Arte e Cultura': ['arte', 'cultura', 'galeria', 'museu', 'exposição', 'instalação', 'performance', 'artes visuais'],
  'Gastronomia': ['gastronomia', 'culinária', 'restaurante', 'food', 'comida', 'chef', 'degustação', 'workshop culinário'],
  'Cursos': ['curso', 'workshop', 'aula', 'treinamento', 'oficina', 'aprendizado', 'capacitação'],
  'Palestras': ['palestra', 'conferência', 'seminário', 'talk', 'debate', 'painel', 'mesa redonda'],
  'Infantil': ['infantil', 'crianças', 'kids', 'brincadeiras', 'atividades recreativas', 'teatro infantil'],
  'Exposições': ['exposição', 'mostra', 'galeria', 'museu', 'arte visual', 'fotografia', 'pintura', 'escultura'],
  'Festivais': ['festival', 'feira', 'evento grande', 'multidão', 'edição', 'anual'],
  'Cinema': ['cinema', 'filme', 'sessão', 'screening', 'documentário', 'curta', 'longa'],
  'Dança': ['dança', 'ballet', 'contemporânea', 'clássica', 'coreografia', 'balé'],
  'São João': ['são joão', 'junina', 'juninas', 'quadrilha', 'arrastão', 'forró pé de serra', 'baião', 'xote', 'xaxado', 'fogueira', 'pula fogueira', 'caipira', 'nordestina', 'campesina'],
}

function buildCategorizationPrompt(title: string, description?: string): string {
  const text = description ? `${title}\n\n${description}` : title

  return `
Analise este evento cultural e retorne:
1. A categoria mais apropriada da lista abaixo
2. Tags relevantes (máximo 5) para ajudar na filtragem

Categorias disponíveis:
${CATEGORIES.map(c => `- ${c}`).join('\n')}

Tags especiais importantes:
- Se o evento for de FORRÓ ou SÃO JOÃO, SEMPRE inclua a tag "são joão"
- Se for festa junina, inclua "junina"
- Se for quadrilha, inclua "quadrilha"
- Se for arrastão, inclua "arrastão"

Evento:
${text}

Retorne APENAS um JSON válido neste formato:
{
  "category": "Nome da Categoria",
  "tags": ["tag1", "tag2", "tag3"]
}

Regras:
- Use EXATAMENTE uma das categorias listadas acima
- Tags devem ser em minúsculas
- Seja específico: "forró" em vez de "música"
- Máximo 5 tags
- Se for forró/são joão, SEMPRE inclua "são joão" nas tags
`.trim()
}

export async function categorizeEvent(
  title: string,
  description?: string
): Promise<CategorizationResult> {
  // Fallback: categorização baseada em regex
  const fallbackCategorize = (): CategorizationResult => {
    const text = `${title} ${description || ''}`.toLowerCase()

    // Verificar São João primeiro (prioridade)
    if (text.match(/são joão|junina|juninas|quadrilha|arrastão|forró pé de serra|baião|xote|xaxado|fogueira|pula fogueira|caipira|nordestina|campesina/)) {
      return {
        category: 'Shows e Festas',
        tags: ['são joão', 'forró', 'junina'],
      }
    }

    // Categorias principais
    if (text.match(/teatro|peça|espetáculo|drama|comédia|monólogo/)) {
      return { category: 'Teatro', tags: ['teatro'] }
    }
    if (text.match(/arte|exposição|galeria|museu|cultura|mostra/)) {
      return { category: 'Exposições', tags: ['exposição', 'arte'] }
    }
    if (text.match(/gastronomia|culinária|restaurante|food|comida|chef|degustação/)) {
      return { category: 'Gastronomia', tags: ['gastronomia'] }
    }
    if (text.match(/curso|workshop|aula|treinamento|oficina|aprendizado/)) {
      return { category: 'Cursos', tags: ['curso', 'workshop'] }
    }
    if (text.match(/palestra|conferência|seminário|talk|debate|painel/)) {
      return { category: 'Palestras', tags: ['palestra'] }
    }
    if (text.match(/infantil|crianças|kids|brincadeiras|atividades recreativas/)) {
      return { category: 'Infantil', tags: ['infantil'] }
    }
    if (text.match(/festival|feira|evento grande|multidão/)) {
      return { category: 'Festivais', tags: ['festival'] }
    }
    if (text.match(/cinema|filme|sessão|screening|documentário|curta|longa/)) {
      return { category: 'Cinema', tags: ['cinema'] }
    }
    if (text.match(/dança|ballet|contemporânea|clássica|coreografia|balé/)) {
      return { category: 'Dança', tags: ['dança'] }
    }

    // Shows e Festas (default)
    const tags: string[] = []
    if (text.match(/show|música|concert/)) tags.push('show')
    if (text.match(/samba|pagode/)) tags.push('samba')
    if (text.match(/rock/)) tags.push('rock')
    if (text.match(/jazz/)) tags.push('jazz')
    if (text.match(/mpb/)) tags.push('mpb')
    if (text.match(/reggae/)) tags.push('reggae')
    if (text.match(/forró/)) tags.push('forró')
    if (text.match(/axé/)) tags.push('axé')
    if (text.match(/funk/)) tags.push('funk')
    if (text.match(/eletrônica/)) tags.push('eletrônica')

    return {
      category: 'Shows e Festas',
      tags: tags.length > 0 ? tags : ['show'],
    }
  }

  // Se Gemini não configurado, usar fallback
  if (!model) {
    console.log('  ⚠️  Gemini API not configured, using fallback categorization')
    return fallbackCategorize()
  }

  try {
    const prompt = buildCategorizationPrompt(title, description)
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extrair JSON
    let jsonText = text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim()
    }

    const result_ = JSON.parse(jsonText) as CategorizationResult

    // Validar categoria
    if (!CATEGORIES.includes(result_.category)) {
      console.log(`  ⚠️  Invalid category "${result_.category}", using fallback`)
      return fallbackCategorize()
    }

    // Validar tags
    if (!Array.isArray(result_.tags) || result_.tags.length === 0) {
      console.log('  ⚠️  Invalid tags, using fallback')
      return fallbackCategorize()
    }

    // Garantir tags em minúsculas
    result_.tags = result_.tags.map(t => t.toLowerCase())

    console.log(`  ✅ Categorized as ${result_.category} with tags: ${result_.tags.join(', ')}`)
    return result_

  } catch (err) {
    console.log(`  ⚠️  Error categorizing: ${err instanceof Error ? err.message : 'Unknown error'}, using fallback`)
    return fallbackCategorize()
  }
}
