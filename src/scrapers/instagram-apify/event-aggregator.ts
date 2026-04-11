import type { ExtractedEvent } from '../../types/instagram.types.js'

export class EventAggregator {
  /**
   * Remove eventos duplicados baseado em título, data e local
   */
  deduplicate(events: ExtractedEvent[]): ExtractedEvent[] {
    const seen = new Map<string, ExtractedEvent>()

    for (const event of events) {
      const key = this.generateKey(event)
      
      if (!seen.has(key)) {
        seen.set(key, event)
      } else {
        // Merge informações se o novo evento tiver mais detalhes
        const existing = seen.get(key)!
        seen.set(key, this.merge(existing, event))
      }
    }

    return Array.from(seen.values())
  }

  /**
   * Gera chave única para identificar eventos duplicados
   */
  private generateKey(event: ExtractedEvent): string {
    // Normalizar título, data e local para comparação
    const normalizedTitle = this.normalize(event.title)
    const normalizedVenue = this.normalize(event.venue)
    
    return `${normalizedTitle}|${event.date}|${normalizedVenue}`
  }

  /**
   * Normaliza texto para comparação (remove acentos, pontuação, espaços extras)
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^\w\s]/g, '') // Remover pontuação
      .replace(/\s+/g, '-') // Substituir espaços por hífen
      .trim()
  }

  /**
   * Merge dois eventos, mantendo a informação mais completa
   */
  private merge(existing: ExtractedEvent, newEvent: ExtractedEvent): ExtractedEvent {
    return {
      // Manter título mais longo (geralmente mais descritivo)
      title: existing.title.length >= newEvent.title.length ? existing.title : newEvent.title,
      
      // Manter data e horário do existente (primeiro encontrado)
      date: existing.date,
      time: existing.time,
      
      // Manter local mais longo
      venue: existing.venue.length >= newEvent.venue.length ? existing.venue : newEvent.venue,
      
      // Preferir preço específico sobre "Consulte"
      price: this.mergePrices(existing.price, newEvent.price),
      
      // Combinar descrições se ambas existirem
      description: this.mergeDescriptions(existing.description, newEvent.description),
    }
  }

  /**
   * Merge preços, preferindo informação mais específica
   */
  private mergePrices(price1: string, price2: string): string {
    // Se um é "Consulte" e outro não, usar o específico
    if (price1 === 'Consulte' && price2 !== 'Consulte') {
      return price2
    }
    if (price2 === 'Consulte' && price1 !== 'Consulte') {
      return price1
    }
    
    // Se ambos são "Grátis" ou "Gratuito", normalizar para "Grátis"
    if (price1.toLowerCase().includes('grát') || price1.toLowerCase().includes('gratuito')) {
      return 'Grátis'
    }
    
    // Caso contrário, manter o primeiro
    return price1
  }

  /**
   * Merge descrições, combinando se forem diferentes
   */
  private mergeDescriptions(desc1?: string, desc2?: string): string | undefined {
    if (!desc1 && !desc2) return undefined
    if (!desc1) return desc2
    if (!desc2) return desc1
    
    // Se são muito similares, manter apenas uma
    if (this.areSimilar(desc1, desc2)) {
      return desc1.length >= desc2.length ? desc1 : desc2
    }
    
    // Se são diferentes, combinar
    return `${desc1} | ${desc2}`
  }

  /**
   * Verifica se dois textos são similares (>80% de overlap)
   */
  private areSimilar(text1: string, text2: string): boolean {
    const norm1 = this.normalize(text1)
    const norm2 = this.normalize(text2)
    
    if (norm1 === norm2) return true
    
    // Calcular similaridade básica
    const shorter = norm1.length < norm2.length ? norm1 : norm2
    const longer = norm1.length >= norm2.length ? norm1 : norm2
    
    return longer.includes(shorter)
  }

  /**
   * Ordena eventos por data e horário
   */
  sort(events: ExtractedEvent[]): ExtractedEvent[] {
    return events.sort((a, b) => {
      // Converter data DD/MM/YYYY para timestamp
      const dateA = this.dateToTimestamp(a.date, a.time)
      const dateB = this.dateToTimestamp(b.date, b.time)
      
      return dateA - dateB
    })
  }

  /**
   * Converte data DD/MM/YYYY e hora HH:MM para timestamp
   */
  private dateToTimestamp(dateStr: string, timeStr: string): number {
    const [day, month, year] = dateStr.split('/').map(Number)
    const [hour, minute] = timeStr.split(':').map(Number)
    
    return new Date(year, month - 1, day, hour, minute).getTime()
  }

  /**
   * Filtra eventos passados
   */
  filterFuture(events: ExtractedEvent[]): ExtractedEvent[] {
    const now = Date.now()
    
    return events.filter(event => {
      const eventTime = this.dateToTimestamp(event.date, event.time)
      return eventTime > now
    })
  }

  /**
   * Agrupa eventos por data
   */
  groupByDate(events: ExtractedEvent[]): Map<string, ExtractedEvent[]> {
    const grouped = new Map<string, ExtractedEvent[]>()
    
    for (const event of events) {
      const existing = grouped.get(event.date) || []
      existing.push(event)
      grouped.set(event.date, existing)
    }
    
    return grouped
  }

  /**
   * Estatísticas dos eventos
   */
  getStats(events: ExtractedEvent[]): {
    total: number
    byDate: Map<string, number>
    free: number
    paid: number
  } {
    const byDate = new Map<string, number>()
    let free = 0
    let paid = 0
    
    for (const event of events) {
      // Contar por data
      byDate.set(event.date, (byDate.get(event.date) || 0) + 1)
      
      // Contar grátis vs pagos
      if (event.price.toLowerCase().includes('grát') || event.price.toLowerCase().includes('gratuito')) {
        free++
      } else if (event.price !== 'Consulte') {
        paid++
      }
    }
    
    return {
      total: events.length,
      byDate,
      free,
      paid,
    }
  }
}
