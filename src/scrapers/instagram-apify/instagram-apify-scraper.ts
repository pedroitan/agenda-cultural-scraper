import { ApifyAdapter } from './apify-adapter.js'
import { ContentDetector } from './content-detector.js'
import { TextProcessor } from './text-processor.js'
import { ImageProcessor } from './image-processor.js'
import { MessageProcessor } from './message-processor.js'
import { EventAggregator } from './event-aggregator.js'
import type { InstagramPost } from '../../types/instagram.types.js'
import type { EventInput } from '../../types.js'

export interface InstagramApifyScraperConfig {
  username: string
  maxPosts: number
  includeStories: boolean
  apifyToken: string
  geminiApiKey: string
  specificPostUrls?: string[]  // URLs específicas de posts para buscar
}

export interface ScrapeResult {
  items_fetched: number
  valid: EventInput[]
  invalid_count: number
  stats: {
    postsProcessed: number
    eventsExtracted: number
    captionEvents: number
    imageEvents: number
    messageEvents: number
  }
}

export class InstagramApifyScraper {
  private textProcessor: TextProcessor
  private imageProcessor: ImageProcessor
  private eventAggregator: EventAggregator
  private apifyAdapter: ApifyAdapter
  private contentDetector: ContentDetector
  private messageProcessor: MessageProcessor
  private config: InstagramApifyScraperConfig
  private loggedConversion: boolean = false

  constructor(config: InstagramApifyScraperConfig) {
    this.config = config
    this.apifyAdapter = new ApifyAdapter(config.apifyToken)
    this.contentDetector = new ContentDetector()
    this.textProcessor = new TextProcessor()
    this.imageProcessor = new ImageProcessor(config.geminiApiKey)
    this.messageProcessor = new MessageProcessor()
    this.eventAggregator = new EventAggregator()
  }

  /**
   * Executa scraping completo de Instagram
   */
  async scrape(): Promise<ScrapeResult> {
    console.log(`\n🚀 Starting Instagram Apify Scraper for @${this.config.username}`)
    
    const stats = {
      postsProcessed: 0,
      eventsExtracted: 0,
      captionEvents: 0,
      imageEvents: 0,
      messageEvents: 0
    }

    const allEvents: any[] = []

    try {
      // 1. Buscar posts via Apify
      console.log(`\n📱 Fetching posts via Apify...`)
      const posts = await this.apifyAdapter.getInstagramPosts({
        username: this.config.username,
        maxPosts: this.config.maxPosts,
        includeStories: this.config.includeStories,
        specificPostUrls: this.config.specificPostUrls
      })

      stats.postsProcessed = posts.length

      // 2. Processar cada post
      for (const post of posts) {
        console.log(`\n📝 Processing post ${post.id}`)
        console.log(`   Type: ${post.type}`)
        console.log(`   Caption preview: ${post.caption.substring(0, 200)}...`)
        
        const postEvents = await this.processPost(post)
        allEvents.push(...postEvents)

        // Atualizar stats
        const captionEvents = await this.textProcessor.extractEvents(post.caption, post.url)
        stats.captionEvents += captionEvents.length
      }

      // 3. Deduplicar e organizar eventos
      const deduplicatedEvents = this.eventAggregator.deduplicate(allEvents)
      const futureEvents = this.eventAggregator.filterFuture(deduplicatedEvents)
      const sortedEvents = this.eventAggregator.sort(futureEvents)

      stats.eventsExtracted = sortedEvents.length

      // 4. Converter para EventInput
      const validEvents = sortedEvents.map(event => this.convertToEventInput(event))

      console.log(`\n✅ Scrape completed`)
      console.log(`   Posts processed: ${stats.postsProcessed}`)
      console.log(`   Events extracted: ${stats.eventsExtracted}`)
      console.log(`   Caption events: ${stats.captionEvents}`)
      console.log(`   Image events: ${stats.imageEvents}`)
      console.log(`   Message events: ${stats.messageEvents}`)

      return {
        items_fetched: posts.length,
        valid: validEvents,
        invalid_count: 0,
        stats
      }
    } catch (error) {
      console.error(`❌ Scrape failed:`, error)
      throw error
    }
  }

  /**
   * Processa um post individual
   */
  private async processPost(post: InstagramPost): Promise<any[]> {
    const events: any[] = []

    // 1. Detectar tipo de conteúdo
    const metadata = this.contentDetector.detect(post)
    const quality = this.contentDetector.estimateQuality(post, metadata)

    console.log(`\n📝 Processing post ${post.id}`)
    console.log(`   Type: ${metadata.type}`)
    console.log(`   Quality: ${quality}/100`)

    // 2. Processar caption (incluindo mensagens de continuação)
    if (metadata.hasCaption) {
      const captionEvents = await this.textProcessor.extractEvents(post.caption, post.url)
      // Adicionar imagem de perfil e primeira imagem do post aos eventos do caption
      const captionEventsWithImages = captionEvents.map(event => ({
        ...event,
        imageUrl: post.images[0] || post.profilePicture,
        sourceUrl: post.url,
      }))
      events.push(...captionEventsWithImages)
    }

    // 3. Processar imagens (se houver)
    if (metadata.hasImages && post.images.length > 0) {
      try {
        // Converter URLs de imagens para Buffers
        const imageBuffers = await this.downloadImages(post.images)
        const imageEvents = await this.imageProcessor.extractEvents(imageBuffers)
        // Adicionar imagem de perfil aos eventos da imagem
        const imageEventsWithImages = imageEvents.map(event => ({
          ...event,
          imageUrl: post.profilePicture,
          sourceUrl: post.url,
        }))
        events.push(...imageEventsWithImages)
      } catch (error) {
        console.warn(`   ⚠️ Failed to process images: ${error}`)
      }
    }

    // 4. Processar mensagens (comentários do autor)
    if (post.commentsCount && post.commentsCount > 0) {
      // Nota: ApifyAdapter já concatena comentários do autor no caption
      // Mas podemos processar separadamente se necessário
    }

    return events
  }

  /**
   * Converte evento extraído para EventInput
   */
  private convertToEventInput(event: any): EventInput {
    // Logar para debug (primeira vez apenas)
    if (!this.loggedConversion) {
      console.log(`   🔍 Converting event: ${event.title}`)
      console.log(`      imageUrl from event:`, event.imageUrl ? 'YES' : 'NO')
      console.log(`      imageUrl value:`, event.imageUrl?.substring(0, 50) || 'N/A')
      this.loggedConversion = true
    }

    // Converter data para ISO (aceita DD/MM/YYYY ou YYYY-MM-DD)
    let startDatetime: string

    try {
      let day: number, month: number, year: number

      if (event.date && event.date.includes('-')) {
        // Formato YYYY-MM-DD (retornado por extractDateFromCaption)
        const dateParts = event.date.split('-')
        year = parseInt(dateParts[0])
        month = parseInt(dateParts[1])
        day = parseInt(dateParts[2])
      } else if (event.date && event.date.includes('/')) {
        // Formato DD/MM/YYYY
        const dateParts = event.date.split('/')
        day = parseInt(dateParts[0])
        month = parseInt(dateParts[1])
        year = parseInt(dateParts[2])
      } else {
        throw new Error(`Unknown date format: ${event.date}`)
      }

      const timeParts = (event.time || '19:00').split(':')
      const hours = parseInt(timeParts[0]) || 19
      const minutes = parseInt(timeParts[1]) || 0

      const dateObj = new Date(year, month - 1, day, hours, minutes)

      // Validar se a data é válida
      if (isNaN(dateObj.getTime())) {
        console.warn(`   ⚠️ Invalid date: ${event.date} ${event.time}`)
        throw new Error('Invalid date')
      }

      startDatetime = dateObj.toISOString()
    } catch (error) {
      console.warn(`   ⚠️ Failed to parse date for "${event.title}": ${event.date} ${event.time}`)
      // Usar data atual como fallback
      startDatetime = new Date().toISOString()
    }

    return {
      source: 'instagram',
      external_id: `instagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: event.title,
      start_datetime: startDatetime,
      city: 'salvador',
      venue_name: event.venue,
      image_url: event.imageUrl || null,
      is_free: event.price.toLowerCase().includes('grátis') || event.price.toLowerCase().includes('free'),
      price_text: event.price,
      category: this.extractCategory(event.title),
      url: event.sourceUrl || 'https://instagram.com/agendaalternativasalvador',
      raw_payload: event
    }
  }

  /**
   * Extrai categoria do título do evento
   */
  private extractCategory(title: string): string {
    const lowerTitle = title.toLowerCase()

    if (lowerTitle.includes('show') || lowerTitle.includes('música') || lowerTitle.includes('concerto')) {
      return 'Shows'
    }
    if (lowerTitle.includes('teatro') || lowerTitle.includes('peça')) {
      return 'Teatro'
    }
    if (lowerTitle.includes('exposição') || lowerTitle.includes('arte') || lowerTitle.includes('galeria')) {
      return 'Exposições'
    }
    if (lowerTitle.includes('festa') || lowerTitle.includes('balada')) {
      return 'Festas'
    }
    if (lowerTitle.includes('cinema') || lowerTitle.includes('filme')) {
      return 'Cinema'
    }
    if (lowerTitle.includes('oficina') || lowerTitle.includes('workshop')) {
      return 'Oficinas'
    }

    return 'Outros'
  }

  /**
   * Baixa imagens de URLs e converte para Buffers
   */
  private async downloadImages(imageUrls: string[]): Promise<Buffer[]> {
    const buffers: Buffer[] = []

    for (const url of imageUrls) {
      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        buffers.push(Buffer.from(arrayBuffer))
      } catch (error) {
        console.warn(`   ⚠️ Failed to download image: ${url}`)
      }
    }

    return buffers
  }

  /**
   * Testa conexão com Apify
   */
  async testConnection(): Promise<boolean> {
    return await this.apifyAdapter.testConnection()
  }

  /**
   * Verifica créditos disponíveis
   */
  async checkCredits(): Promise<number> {
    return await this.apifyAdapter.checkCredits()
  }
}
