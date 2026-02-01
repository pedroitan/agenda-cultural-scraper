import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

let genAI: GoogleGenerativeAI | null = null
let model: any = null

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey)
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

export type ExtractedEvent = {
  title: string
  date: string // DD/MM/YYYY
  time: string // HH:MM
  venue: string
  price: string // "Grátis" | "Consulte" | "R$ XX"
  description?: string
}

const PROMPT = `
Analise esta imagem de post do Instagram e extraia TODOS os eventos culturais mencionados.

Para cada evento, retorne um objeto JSON com:
- title: Nome do evento (máximo 100 caracteres)
- date: Data no formato DD/MM/YYYY (se não tiver ano, use 2026)
- time: Horário no formato HH:MM (se não especificado, use "19:00")
- venue: Local do evento (nome do local, endereço ou bairro)
- price: Preço ("Grátis" se gratuito, "Consulte" se não especificado, ou valor como "R$ 50")
- description: Descrição adicional se houver (opcional)

IMPORTANTE:
- Retorne APENAS um array JSON válido, sem texto adicional
- Se não houver eventos, retorne um array vazio: []
- Ignore informações que não sejam eventos (propaganda, avisos, etc)
- Se a data for relativa (ex: "sábado"), calcule a data mais próxima
- Se houver múltiplos eventos na mesma imagem, retorne todos

Exemplo de resposta:
[
  {
    "title": "Show de Fulano",
    "date": "15/02/2026",
    "time": "20:00",
    "venue": "Teatro Castro Alves",
    "price": "R$ 50",
    "description": "Com participação especial de Beltrano"
  }
]
`.trim()

export async function extractEventsFromImage(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<ExtractedEvent[]> {
  if (!model) {
    console.log('  ⚠️  Gemini API not configured')
    return []
  }

  try {
    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      },
    ])

    const response = await result.response
    const text = response.text()

    // Extract JSON from response (may have markdown code blocks)
    let jsonText = text.trim()
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim()
    }

    // Parse JSON
    const events = JSON.parse(jsonText)

    if (!Array.isArray(events)) {
      console.log('  ⚠️  Response is not an array')
      return []
    }

    console.log(`  ✅ Extracted ${events.length} event(s) from image`)
    return events

  } catch (err) {
    console.log(`  ⚠️  Error extracting events: ${err instanceof Error ? err.message : 'Unknown error'}`)
    return []
  }
}
