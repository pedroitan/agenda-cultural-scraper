import type { ExtractedEvent } from '../../types/instagram.types.js'

export class TextProcessor {
  async extractEvents(caption: string, postUrl: string, postDate?: string): Promise<ExtractedEvent[]> {
    const events: ExtractedEvent[] = []
    
    // Limpar caption (remover ruído do Instagram)
    const cleanCaption = this.cleanCaption(caption)
    
    if (cleanCaption.length < 20) {
      return events
    }
    
    // Extrair data do caption se não foi fornecida
    const eventDate = postDate || this.extractDateFromCaption(cleanCaption)
    
    // Dividir por eventos (geralmente separados por linha em branco ou emoji)
    const eventBlocks = this.splitIntoEventBlocks(cleanCaption)
    
    console.log(`  📝 Found ${eventBlocks.length} potential event block(s) in caption`)
    if (eventDate) {
      console.log(`  📅 Event date: ${eventDate}`)
    }
    
    for (const block of eventBlocks) {
      const event = this.parseEventBlock(block, eventDate)
      if (event) {
        events.push(event)
      }
    }
    
    return events
  }

  /**
   * Extrai data do caption (formato: "♫ Agenda de #Sexta, 27 de Março ♫")
   */
  private extractDateFromCaption(caption: string): string | undefined {
    // Padrão: ♫ Agenda de #DiaDaSemana, DD de Mês ♫
    // Usar [^\s,]+ para capturar palavras com acentos
    const dateMatch = caption.match(/♫\s*Agenda\s+de\s+#[^\s,]+,\s+(\d+)\s+de\s+([^\s♫]+)/i)
    
    if (dateMatch) {
      const day = dateMatch[1]
      const month = dateMatch[2].trim()
      
      // Mapear mês para número
      const monthMap: Record<string, string> = {
        'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
        'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
        'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
      }
      
      const monthNum = monthMap[month.toLowerCase()]
      if (monthNum) {
        const year = new Date().getFullYear()
        return `${year}-${monthNum}-${day.padStart(2, '0')}`
      }
    }
    
    return undefined
  }

  private cleanCaption(caption: string): string {
    if (!caption) return ''
    
    // Remover ruído comum do Instagram
    return caption
      .replace(/Curtir|Comentar|Compartilhar|Ver tradução/g, '')
      .replace(/\d+ curtidas?/g, '')
      .replace(/há \d+ (hora|dia|semana)s?/g, '')
      .replace(/Seguir|Following|Follow/g, '')
      .replace(/Ver mais|See more/g, '')
      .trim()
  }

  private splitIntoEventBlocks(text: string): string[] {
    // Dividir por separador padrão usado no Instagram
    const separator = '_____________________________'
    
    // Se tem separador, usar ele
    if (text.includes(separator)) {
      const initialBlocks = text
        .split(separator)
        .map(block => block.trim())
        .filter(block => block.length > 10)
      
      // Alguns blocos podem ter múltiplos eventos sem separador
      // Detectar e dividir quando vemos "Projeto:" ou "Atrações:" iniciando nova linha
      const finalBlocks: string[] = []
      
      for (const block of initialBlocks) {
        const subBlocks = this.splitMultipleEventsInBlock(block)
        finalBlocks.push(...subBlocks)
      }
      
      console.log(`  📝 Split by separator: ${initialBlocks.length} initial blocks → ${finalBlocks.length} final blocks`)
      return finalBlocks
    }
    
    // Fallback: dividir por linhas vazias ou detecção de início de evento
    const blocks: string[] = []
    const lines = text.split('\n')
    let currentBlock = ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Linha vazia separa blocos
      if (!trimmedLine) {
        if (currentBlock) {
          blocks.push(currentBlock.trim())
          currentBlock = ''
        }
        continue
      }
      
      // Novo evento detectado
      if (this.isEventStart(trimmedLine) && currentBlock) {
        blocks.push(currentBlock.trim())
        currentBlock = trimmedLine
      } else {
        currentBlock += (currentBlock ? '\n' : '') + trimmedLine
      }
    }

    // Adicionar último bloco
    if (currentBlock) {
      blocks.push(currentBlock.trim())
    }

    return blocks.filter(b => b.length > 10)
  }

  /**
   * Divide um bloco que pode conter múltiplos eventos sem separador
   */
  private splitMultipleEventsInBlock(block: string): string[] {
    const lines = block.split('\n')
    const subBlocks: string[] = []
    let currentEvent = ''
    let hasHorario = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Marcar se já vimos "Horário:" no evento atual
      if (line.startsWith('Horário:')) {
        hasHorario = true
      }
      
      // Detectar início de novo evento:
      // Só dividir se encontrar Projeto:/Atrações: DEPOIS de já ter visto Horário:
      if ((line.startsWith('Projeto:') || line.startsWith('Atrações:')) && hasHorario) {
        // Salvar evento anterior
        subBlocks.push(currentEvent.trim())
        currentEvent = line
        hasHorario = false
      } else {
        currentEvent += (currentEvent ? '\n' : '') + line
      }
    }
    
    // Adicionar último evento
    if (currentEvent.trim()) {
      subBlocks.push(currentEvent.trim())
    }
    
    // Se só tem 1 sub-bloco, retornar o bloco original
    return subBlocks.length > 1 ? subBlocks : [block]
  }

  private isEventStart(line: string): boolean {
    // Detectar início de novo evento
    const patterns = [
      /^[🎭🎪🎨🎵🎸🎤🎬🎯🎲🎰]/, // Emoji de evento no início
      /^[A-ZÀ-Ú][a-zà-ú\s]{3,}$/, // Título em maiúscula (mínimo 4 chars)
      /^(SEXTA|SÁBADO|DOMINGO|SEGUNDA|TERÇA|QUARTA|QUINTA)/i, // Dia da semana
    ]

    return patterns.some(pattern => pattern.test(line))
  }

  private parseEventBlock(block: string, eventDate?: string): ExtractedEvent | null {
    // Extrair informações do bloco de texto
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    if (lines.length === 0) {
      return null
    }

    // Extrair campos usando padrões do Instagram
    let title = ''
    let venue = ''
    let time = ''
    let price = 'Consulte'
    let attractions = ''
    
    for (const line of lines) {
      // Projeto: ...
      if (line.startsWith('Projeto:')) {
        title = line.replace('Projeto:', '').trim()
      }
      // Atrações: ...
      else if (line.startsWith('Atrações:') || line.startsWith('Atração:')) {
        attractions = line.replace(/Atrações?:/, '').trim()
        // Se não tem projeto, usar atrações como título
        if (!title) {
          title = attractions
        }
      }
      // Local: ...
      else if (line.startsWith('Local:')) {
        venue = line.replace('Local:', '').trim()
      }
      // Horário: ...
      else if (line.startsWith('Horário:')) {
        time = line.replace('Horário:', '').trim()
        // Normalizar formato (remover 'h' extra, etc)
        time = time.replace(/(\d{1,2})h(\d{2})?/, '$1:$2').replace(/h$/, ':00')
      }
      // Quanto: ...
      else if (line.startsWith('Quanto:')) {
        price = line.replace('Quanto:', '').trim()
      }
      // Fallback: se primeira linha não tem prefixo, pode ser título
      else if (!title && lines.indexOf(line) === 0) {
        title = line.replace(/^[🎭🎪🎨🎵🎸🎤🎬🎯🎲🎰]\s*/, '')
      }
    }

    // Se não tem título, tentar usar primeira linha
    if (!title && lines.length > 0) {
      title = lines[0].replace(/^[🎭🎪🎨🎵🎸🎤🎬🎯🎲🎰]\s*/, '')
    }

    // Validação mínima: precisa ter título
    if (!title || title.length < 3) {
      return null
    }

    // Se tem atrações e projeto, combinar no título
    if (attractions && title !== attractions) {
      title = `${title} - ${attractions}`
    }

    // Normalizar horário
    if (!time) {
      time = '19:00' // Default
    } else {
      // Garantir formato HH:MM
      if (!time.includes(':')) {
        time = time + ':00'
      }
      // Remover sufixos
      time = time.replace(/h$/, '').trim()
    }

    // Normalizar preço
    if (price.toLowerCase().includes('grát') || price.toLowerCase().includes('gratuito')) {
      price = 'Grátis'
    } else if (price.toLowerCase().includes('colaboração')) {
      price = 'Colaboração consciente'
    } else if (price.toLowerCase().includes('sympla')) {
      price = 'Consulte Sympla'
    }

    return {
      title: title.trim(),
      venue: venue || 'A confirmar',
      time: time,
      price: price,
      date: eventDate || this.inferDate(), // Usar data extraída do caption ou hoje
      description: undefined,
    }
  }

  private findInLines(lines: string[], pattern: RegExp): string | null {
    for (const line of lines) {
      const match = line.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }

  private extractDescription(lines: string[]): string | null {
    // Pegar linhas que não são metadados (sem emojis de info)
    const descLines = lines.filter(line => {
      return !line.match(/^[📍📅⏰💰🎭🎪🎨🎵🎸🎤]/) &&
             !line.match(/^\d{1,2}:\d{2}/) &&
             line.length > 5
    })

    if (descLines.length > 1) {
      // Remover primeira linha (título)
      return descLines.slice(1).join(' ').trim()
    }

    return null
  }

  private parseDate(dateStr: string): string {
    // Converter DD/MM para DD/MM/YYYY
    const [day, month] = dateStr.split('/')
    const year = new Date().getFullYear()
    
    // Se o mês já passou, assumir ano seguinte
    const currentMonth = new Date().getMonth() + 1
    const eventMonth = parseInt(month)
    const finalYear = eventMonth < currentMonth ? year + 1 : year
    
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${finalYear}`
  }

  private inferDate(): string {
    // Usar data de hoje como fallback
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `${day}/${month}/${year}`
  }

  /**
   * Detecta o contexto de data no caption (ex: "SEXTA-FEIRA (30/01)")
   * Útil para processar múltiplos eventos do mesmo dia
   */
  detectDateContext(caption: string): Map<string, string> {
    const dateContexts = new Map<string, string>()
    
    const headerPattern = /(SEXTA|SÁBADO|DOMINGO|SEGUNDA|TERÇA|QUARTA|QUINTA)(?:-FEIRA)?\s*\((\d{1,2}\/\d{1,2})\)/gi
    
    let match
    while ((match = headerPattern.exec(caption)) !== null) {
      const dayOfWeek = match[1]
      const date = match[2]
      dateContexts.set(dayOfWeek.toUpperCase(), this.parseDate(date))
    }
    
    return dateContexts
  }
}
