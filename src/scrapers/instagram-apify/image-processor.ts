import { extractEventsFromImage } from '../../utils/gemini-vision.js'
import type { ExtractedEvent } from '../../types/instagram.types.js'

export class ImageProcessor {
  private geminiApiKey: string

  constructor(geminiApiKey: string) {
    this.geminiApiKey = geminiApiKey
  }

  /**
   * Extrai eventos de múltiplas imagens usando Gemini Vision
   * Processa sequencialmente para manter contexto de data
   */
  async extractEvents(
    images: Buffer[],
    previousDate?: string
  ): Promise<ExtractedEvent[]> {
    const allEvents: ExtractedEvent[] = []
    let lastDate = previousDate

    console.log(`  🖼️  Processing ${images.length} image(s) with Gemini Vision...`)

    for (let i = 0; i < images.length; i++) {
      const imageBuffer = images[i]
      
      try {
        console.log(`    [${i + 1}/${images.length}] Analyzing image...`)
        
        const events = await extractEventsFromImage(
          imageBuffer,
          'image/jpeg',
          lastDate
        )

        console.log(`    ✅ Extracted ${events.length} event(s)`)

        if (events.length > 0) {
          allEvents.push(...events)
          // Atualizar contexto de data para próxima imagem
          lastDate = events[events.length - 1].date
        }
      } catch (error) {
        console.error(`    ❌ Error processing image ${i + 1}:`, error)
        // Continuar com próxima imagem
      }
    }

    return allEvents
  }

  /**
   * Processa uma única imagem
   */
  async extractFromSingleImage(
    imageBuffer: Buffer,
    previousDate?: string
  ): Promise<ExtractedEvent[]> {
    return await this.extractEvents([imageBuffer], previousDate)
  }

  /**
   * Valida se uma imagem é processável
   */
  async validateImage(imageBuffer: Buffer): Promise<boolean> {
    // Verificar tamanho mínimo (10KB)
    if (imageBuffer.length < 10 * 1024) {
      return false
    }

    // Verificar tamanho máximo (10MB)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return false
    }

    // Verificar se é uma imagem válida (magic bytes)
    const header = imageBuffer.slice(0, 4).toString('hex')
    const validHeaders = [
      'ffd8ffe0', // JPEG
      'ffd8ffe1', // JPEG
      'ffd8ffe2', // JPEG
      '89504e47', // PNG
      '47494638', // GIF
    ]

    return validHeaders.some(valid => header.startsWith(valid))
  }
}
