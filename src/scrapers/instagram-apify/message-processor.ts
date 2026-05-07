/**
 * MessageProcessor
 * 
 * Trata mensagens de continuação do Instagram (comentários do autor)
 * Quando um post tem muitos eventos, o Instagram corta a caption e
 * o autor continua em comentários/mensagens.
 */

export interface MessageData {
  text: string
  author: string
  timestamp: string
}

export interface ProcessedMessage {
  fullText: string
  messageCount: number
  hasContinuation: boolean
}

export class MessageProcessor {
  /**
   * Processa mensagens de continuação
   * Detecta padrões de "ver mais" e concatena com caption
   */
  processMessages(caption: string, messages: MessageData[]): ProcessedMessage {
    let fullText = caption
    let messageCount = 0
    let hasContinuation = false

    // Detectar se caption foi cortada
    const isTruncated = this.detectTruncation(caption)
    
    if (isTruncated) {
      hasContinuation = true
      
      // Filtrar apenas mensagens do próprio autor
      const authorMessages = messages.filter(m => 
        this.isAuthorMessage(m, caption)
      )

      messageCount = authorMessages.length

      // Concatenar mensagens em ordem cronológica
      for (const msg of authorMessages) {
        fullText += '\n\n' + msg.text
      }
    }

    return {
      fullText,
      messageCount,
      hasContinuation
    }
  }

  /**
   * Detecta se caption foi cortada pelo Instagram
   * Padrões: "… more", "...", truncation no meio de frase
   */
  private detectTruncation(caption: string): boolean {
    const truncationPatterns = [
      /\.\.\.\s*$/m,  // ... no final
      /…\s*$/m,      // … no final
      /ver mais/i,    // "ver mais"
      /more/i,        // "more"
      /\s\.\.\.\s/m,  // ... no meio
      /\s…\s/m,       // … no meio
    ]

    return truncationPatterns.some(pattern => pattern.test(caption))
  }

  /**
   * Verifica se mensagem é do autor do post
   * Assumindo que o autor é consistente com o contexto do post
   */
  private isAuthorMessage(message: MessageData, caption: string): boolean {
    // Para @agendaalternativasalvador, o autor é consistente
    // Mensagens de continuação geralmente têm o mesmo username
    return message.author === 'agendaalternativasalvador' || 
           message.author === 'agenda_alternativasalvador'
  }

  /**
   * Extrai eventos de mensagens individuais
   * Útil quando cada mensagem é um evento separado
   */
  extractEventsFromMessages(messages: MessageData[]): string[] {
    const events: string[] = []

    for (const msg of messages) {
      // Verificar se mensagem parece ser um evento
      if (this.looksLikeEvent(msg.text)) {
        events.push(msg.text)
      }
    }

    return events
  }

  /**
   * Verifica se texto parece ser um evento
   * Baseado em emojis de evento e estrutura
   */
  private looksLikeEvent(text: string): boolean {
    const eventEmojis = ['🎭', '🎪', '🎨', '🎵', '🎸', '🎤', '🎉', '🎊']
    const hasEventEmoji = eventEmojis.some(emoji => text.includes(emoji))
    
    const eventKeywords = [
      'sexta', 'sábado', 'domingo', 'quinta',
      'hoje', 'amanhã', 'às',
      '📍', '⏰', '💰', '📅'
    ]
    const hasEventKeyword = eventKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    )

    return hasEventEmoji || hasEventKeyword
  }

  /**
   * Limpa texto de mensagens (remove ruído)
   */
  cleanMessage(text: string): string {
    return text
      .replace(/@\w+/g, '')  // Remove menções
      .replace(/#\w+/g, '')  // Remove hashtags
      .trim()
  }
}
