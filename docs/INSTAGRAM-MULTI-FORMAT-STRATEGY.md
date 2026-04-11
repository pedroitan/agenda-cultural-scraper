# 📱 Estratégia Multi-Formato - Instagram Scraping

## 🎯 Visão Geral

O Instagram possui múltiplos formatos de conteúdo para divulgação de eventos. Nossa estratégia deve contemplar todos eles para maximizar a cobertura de eventos.

## 📊 Formatos Identificados

### 1. **Posts com Texto (Caption)**
**Características:**
- Eventos descritos no caption do post
- Formato estruturado ou semi-estruturado
- Exemplo: @agendaalternativasalvador

**Exemplo:**
```
🎭 SEXTA-FEIRA (30/01)

Disconnected
📍 Só Shape - Rio Vermelho
⏰ 21:00
💰 Grátis

Festa Proibida
📍 Discodelia Pub
⏰ 19:00
💰 Grátis
```

**Estratégia:**
- Parser de texto com regex/NLP
- Identificar padrões (emojis, horários, locais)
- Extrair múltiplos eventos de um único caption

---

### 2. **Posts com Imagens (Feed)**
**Características:**
- Eventos em formato de card/flyer
- Texto embutido na imagem
- Pode ter múltiplas imagens (carrossel)

**Exemplo:**
- Card visual com gradiente
- Título do evento em destaque
- Informações (data, local, preço) na imagem

**Estratégia:**
- Gemini Vision para OCR e extração
- Processar cada imagem do carrossel
- Suporte a layout de 2 colunas

---

### 3. **Stories com Imagens**
**Características:**
- Formato vertical (1080x1920)
- Geralmente temporário (24h)
- Pode ter múltiplos slides

**Exemplo:**
- Lista de eventos do fim de semana
- Eventos gratuitos do dia
- Destaques da semana

**Estratégia:**
- Apify Stories Scraper
- Gemini Vision para extração
- Processar sequencialmente (contexto de data)

---

### 4. **Stories com Vídeos Animados**
**Características:**
- Vídeos curtos (5-15 segundos)
- Texto animado aparecendo
- Transições e efeitos

**Exemplo:**
- Countdown de eventos
- Animação de cards de eventos
- Texto aparecendo gradualmente

**Estratégia:**
- Extrair frames-chave do vídeo
- OCR nos frames estáticos
- Combinar informações de múltiplos frames

---

## 🏗️ Arquitetura Proposta

```
InstagramApifyScraper
├── ContentDetector          # Detecta tipo de conteúdo
├── TextProcessor            # Processa posts com texto
├── ImageProcessor           # Processa imagens (posts/stories)
├── VideoProcessor           # Processa vídeos animados
└── EventAggregator          # Combina e deduplica eventos
```

### Fluxo de Processamento

```
1. Apify busca posts/stories
   ↓
2. ContentDetector identifica tipo
   ↓
3. Router direciona para processador correto
   ├─→ TextProcessor (se tem caption estruturado)
   ├─→ ImageProcessor (se tem imagens)
   └─→ VideoProcessor (se tem vídeos)
   ↓
4. Cada processador extrai eventos
   ↓
5. EventAggregator deduplica e combina
   ↓
6. Validação e transformação
   ↓
7. Upsert no Supabase
```

## 🔧 Implementação Detalhada

### 1. ContentDetector

```typescript
// src/scrapers/instagram-apify/content-detector.ts

export enum ContentType {
  TEXT_ONLY = 'text_only',
  IMAGE_POST = 'image_post',
  IMAGE_STORY = 'image_story',
  VIDEO_STORY = 'video_story',
  CAROUSEL = 'carousel',
}

export interface ContentMetadata {
  type: ContentType
  hasCaption: boolean
  hasImages: boolean
  hasVideo: boolean
  imageCount: number
  isStory: boolean
}

export class ContentDetector {
  detect(post: InstagramPost): ContentMetadata {
    const hasCaption = this.hasStructuredCaption(post.caption)
    const hasImages = post.images && post.images.length > 0
    const hasVideo = post.videoUrl !== undefined
    const isStory = post.type === 'story'

    // Determinar tipo principal
    let type: ContentType

    if (hasVideo && isStory) {
      type = ContentType.VIDEO_STORY
    } else if (hasImages && isStory) {
      type = ContentType.IMAGE_STORY
    } else if (hasImages && post.images.length > 1) {
      type = ContentType.CAROUSEL
    } else if (hasImages) {
      type = ContentType.IMAGE_POST
    } else if (hasCaption) {
      type = ContentType.TEXT_ONLY
    } else {
      type = ContentType.TEXT_ONLY // fallback
    }

    return {
      type,
      hasCaption,
      hasImages,
      hasVideo,
      imageCount: post.images?.length || 0,
      isStory,
    }
  }

  private hasStructuredCaption(caption: string): boolean {
    // Detectar se caption tem estrutura de eventos
    const patterns = [
      /\d{1,2}:\d{2}/, // Horário
      /📍|📅|⏰|💰/, // Emojis comuns
      /sexta|sábado|domingo|segunda/i, // Dias da semana
    ]

    return patterns.some(pattern => pattern.test(caption))
  }
}
```

### 2. TextProcessor

```typescript
// src/scrapers/instagram-apify/text-processor.ts

export class TextProcessor {
  async extractEvents(caption: string, postUrl: string): Promise<ExtractedEvent[]> {
    const events: ExtractedEvent[] = []
    
    // Limpar caption (remover ruído do Instagram)
    const cleanCaption = this.cleanCaption(caption)
    
    // Dividir por eventos (geralmente separados por linha em branco ou emoji)
    const eventBlocks = this.splitIntoEventBlocks(cleanCaption)
    
    for (const block of eventBlocks) {
      const event = this.parseEventBlock(block)
      if (event) {
        events.push(event)
      }
    }
    
    return events
  }

  private cleanCaption(caption: string): string {
    // Remover ruído comum do Instagram
    return caption
      .replace(/Curtir|Comentar|Compartilhar|Ver tradução/g, '')
      .replace(/\d+ curtidas?/g, '')
      .replace(/há \d+ (hora|dia|semana)s?/g, '')
      .trim()
  }

  private splitIntoEventBlocks(text: string): string[] {
    // Dividir por padrões que indicam novo evento
    // Ex: linha em branco, emoji de título, etc.
    const blocks: string[] = []
    const lines = text.split('\n')
    let currentBlock = ''

    for (const line of lines) {
      if (this.isEventStart(line) && currentBlock) {
        blocks.push(currentBlock.trim())
        currentBlock = line
      } else {
        currentBlock += '\n' + line
      }
    }

    if (currentBlock) {
      blocks.push(currentBlock.trim())
    }

    return blocks.filter(b => b.length > 0)
  }

  private isEventStart(line: string): boolean {
    // Detectar início de novo evento
    return /^[🎭🎪🎨🎵🎸🎤]/.test(line) || // Emoji de evento
           /^[A-Z][a-zÀ-ú\s]+$/.test(line) // Título em maiúscula
  }

  private parseEventBlock(block: string): ExtractedEvent | null {
    // Extrair informações do bloco de texto
    const titleMatch = block.match(/^([^\n]+)/)
    const venueMatch = block.match(/📍\s*([^\n]+)/)
    const timeMatch = block.match(/⏰\s*(\d{1,2}:\d{2})/)
    const priceMatch = block.match(/💰\s*([^\n]+)/)
    const dateMatch = block.match(/📅\s*(\d{1,2}\/\d{1,2})/)

    if (!titleMatch || !venueMatch) {
      return null
    }

    return {
      title: titleMatch[1].replace(/[🎭🎪🎨🎵🎸🎤]/g, '').trim(),
      venue: venueMatch[1].trim(),
      time: timeMatch ? timeMatch[1] : '19:00',
      price: priceMatch ? priceMatch[1].trim() : 'Consulte',
      date: dateMatch ? this.parseDate(dateMatch[1]) : this.inferDate(),
    }
  }

  private parseDate(dateStr: string): string {
    // Converter DD/MM para DD/MM/YYYY
    const [day, month] = dateStr.split('/')
    const year = new Date().getFullYear()
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
  }

  private inferDate(): string {
    // Usar data de hoje como fallback
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `${day}/${month}/${year}`
  }
}
```

### 3. ImageProcessor (já implementado)

```typescript
// src/scrapers/instagram-apify/image-processor.ts

export class ImageProcessor {
  private geminiExtractor: GeminiExtractor

  constructor(geminiApiKey: string) {
    this.geminiExtractor = new GeminiExtractor(geminiApiKey)
  }

  async extractEvents(
    images: Buffer[],
    previousDate?: string
  ): Promise<ExtractedEvent[]> {
    return await this.geminiExtractor.extractEvents(images, previousDate)
  }
}
```

### 4. VideoProcessor

```typescript
// src/scrapers/instagram-apify/video-processor.ts
import ffmpeg from 'fluent-ffmpeg'
import { createWriteStream } from 'fs'
import { unlink } from 'fs/promises'

export class VideoProcessor {
  private imageProcessor: ImageProcessor

  constructor(imageProcessor: ImageProcessor) {
    this.imageProcessor = imageProcessor
  }

  async extractEvents(videoUrl: string): Promise<ExtractedEvent[]> {
    // 1. Download do vídeo
    const videoPath = await this.downloadVideo(videoUrl)

    try {
      // 2. Extrair frames-chave (a cada 2 segundos)
      const frames = await this.extractKeyFrames(videoPath, 2)

      // 3. Processar frames como imagens
      const events = await this.imageProcessor.extractEvents(frames)

      return events
    } finally {
      // 4. Limpar arquivo temporário
      await unlink(videoPath)
    }
  }

  private async downloadVideo(url: string): Promise<string> {
    const tempPath = `/tmp/video-${Date.now()}.mp4`
    const response = await fetch(url)
    const fileStream = createWriteStream(tempPath)
    
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream)
      response.body.on('error', reject)
      fileStream.on('finish', resolve)
    })

    return tempPath
  }

  private async extractKeyFrames(
    videoPath: string,
    intervalSeconds: number
  ): Promise<Buffer[]> {
    const frames: Buffer[] = []
    const tempDir = '/tmp/frames'

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('end', async () => {
          // Ler frames gerados
          const files = await readdir(tempDir)
          for (const file of files) {
            const buffer = await readFile(path.join(tempDir, file))
            frames.push(buffer)
          }
          resolve(frames)
        })
        .on('error', reject)
        .screenshots({
          count: 10, // Máximo 10 frames
          folder: tempDir,
          filename: 'frame-%i.png',
        })
    })
  }
}
```

### 5. InstagramApifyScraper Atualizado

```typescript
// src/scrapers/instagram-apify/index.ts

export class InstagramApifyScraper extends BaseScraper {
  private apifyAdapter: ApifyAdapter
  private contentDetector: ContentDetector
  private textProcessor: TextProcessor
  private imageProcessor: ImageProcessor
  private videoProcessor: VideoProcessor
  private eventAggregator: EventAggregator

  constructor(config: any) {
    super('instagram-apify', config)
    
    this.apifyAdapter = new ApifyAdapter(config.apifyToken)
    this.contentDetector = new ContentDetector()
    this.textProcessor = new TextProcessor()
    this.imageProcessor = new ImageProcessor(config.geminiApiKey)
    this.videoProcessor = new VideoProcessor(this.imageProcessor)
    this.eventAggregator = new EventAggregator()
  }

  async scrape(input: ScraperInput): Promise<ScrapeResult> {
    const allEvents: ExtractedEvent[] = []
    let invalid_count = 0

    // 1. Buscar posts via Apify
    const posts = await this.apifyAdapter.getInstagramPosts({
      username: this.config.instagramUsername,
      maxPosts: this.config.maxPosts || 20,
      includeStories: true, // Incluir stories
    })

    console.log(`📸 Processing ${posts.length} Instagram posts/stories...`)

    // 2. Processar cada post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      console.log(`\n[${i + 1}/${posts.length}] Processing ${post.type} ${post.id}`)

      try {
        // 2.1. Detectar tipo de conteúdo
        const metadata = this.contentDetector.detect(post)
        console.log(`  📋 Content type: ${metadata.type}`)

        let events: ExtractedEvent[] = []

        // 2.2. Processar baseado no tipo
        switch (metadata.type) {
          case ContentType.TEXT_ONLY:
            events = await this.textProcessor.extractEvents(
              post.caption,
              post.url
            )
            break

          case ContentType.IMAGE_POST:
          case ContentType.IMAGE_STORY:
          case ContentType.CAROUSEL:
            const imageBuffers = await downloadImages(post.images)
            events = await this.imageProcessor.extractEvents(imageBuffers)
            break

          case ContentType.VIDEO_STORY:
            events = await this.videoProcessor.extractEvents(post.videoUrl)
            break
        }

        console.log(`  ✅ Extracted ${events.length} event(s)`)
        allEvents.push(...events)

      } catch (error) {
        console.error(`  ❌ Error processing:`, error)
        invalid_count++
      }
    }

    // 3. Agregar e deduplica eventos
    const uniqueEvents = this.eventAggregator.deduplicate(allEvents)
    console.log(`\n🔄 Deduplication: ${allEvents.length} → ${uniqueEvents.length} events`)

    // 4. Validar e transformar
    const valid: EventInput[] = []
    for (const event of uniqueEvents) {
      if (this.validate(event)) {
        valid.push(this.transform(event, post))
      } else {
        invalid_count++
      }
    }

    return {
      valid,
      invalid_count,
      items_fetched: posts.length,
    }
  }
}
```

### 6. EventAggregator

```typescript
// src/scrapers/instagram-apify/event-aggregator.ts

export class EventAggregator {
  deduplicate(events: ExtractedEvent[]): ExtractedEvent[] {
    const seen = new Map<string, ExtractedEvent>()

    for (const event of events) {
      const key = this.generateKey(event)
      
      if (!seen.has(key)) {
        seen.set(key, event)
      } else {
        // Merge informações se necessário
        const existing = seen.get(key)!
        seen.set(key, this.merge(existing, event))
      }
    }

    return Array.from(seen.values())
  }

  private generateKey(event: ExtractedEvent): string {
    // Criar chave única baseada em título + data + local
    const normalized = this.normalize(event.title)
    return `${normalized}-${event.date}-${this.normalize(event.venue)}`
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
  }

  private merge(
    existing: ExtractedEvent,
    newEvent: ExtractedEvent
  ): ExtractedEvent {
    // Manter informação mais completa
    return {
      ...existing,
      description: existing.description || newEvent.description,
      price: existing.price !== 'Consulte' ? existing.price : newEvent.price,
    }
  }
}
```

## 📊 Configuração por Formato

```typescript
// config/scrapers.config.ts

export const scrapersConfig = {
  'instagram-apify': {
    enabled: true,
    instagramUsername: 'agendaalternativasalvador',
    maxPosts: 20,
    includeStories: true,
    apifyToken: process.env.APIFY_TOKEN!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    
    // Configuração por formato
    formats: {
      text: {
        enabled: true,
        priority: 1, // Processar primeiro (mais rápido)
      },
      image: {
        enabled: true,
        priority: 2,
        maxImagesPerPost: 10,
      },
      video: {
        enabled: true,
        priority: 3, // Processar por último (mais lento)
        maxFrames: 10,
        frameInterval: 2, // segundos
      },
    },
  },
}
```

## 🎯 Estratégia de Priorização

### Ordem de Processamento

1. **Texto (Caption)** - Mais rápido, sem custo de API
2. **Imagens** - Médio, usa Gemini Vision
3. **Vídeos** - Mais lento, extração de frames + Gemini

### Otimizações

- **Cache de frames:** Não reprocessar vídeos já vistos
- **Batch processing:** Processar múltiplas imagens em paralelo
- **Early exit:** Se caption já extraiu eventos, pular imagens
- **Fallback:** Se Gemini falhar, tentar parser de texto no caption

## 📈 Métricas Esperadas

### Por Formato

| Formato | Posts/dia | Eventos/post | Taxa Sucesso | Tempo Médio |
|---------|-----------|--------------|--------------|-------------|
| Texto   | 5-10      | 5-15         | 95%          | 1s          |
| Imagem  | 10-15     | 3-8          | 85%          | 5s          |
| Vídeo   | 2-5       | 2-5          | 70%          | 15s         |

### Total Esperado
- **20-30 posts/dia**
- **100-200 eventos/dia**
- **Taxa de sucesso global: 85%**
- **Tempo total: 5-10 minutos**

## 🚀 Implementação Faseada

### Fase 1: Texto + Imagem (Prioritário)
- TextProcessor
- ImageProcessor (já existe)
- ContentDetector básico
- **Tempo: 2-3 dias**

### Fase 2: Vídeos (Opcional)
- VideoProcessor
- Integração ffmpeg
- Testes com vídeos reais
- **Tempo: 2-3 dias**

### Fase 3: Otimizações
- Cache
- Batch processing
- Deduplicação avançada
- **Tempo: 1-2 dias**

## ✅ Benefícios

1. **Cobertura completa:** Todos os formatos de conteúdo
2. **Flexibilidade:** Habilitar/desabilitar formatos
3. **Eficiência:** Priorização por velocidade
4. **Robustez:** Fallbacks e retry
5. **Escalabilidade:** Fácil adicionar novos formatos

## 📚 Dependências Adicionais

```json
{
  "dependencies": {
    "apify-client": "^2.7.1",
    "fluent-ffmpeg": "^2.1.2",
    "@google/generative-ai": "^0.1.3"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.21"
  }
}
```

## 🔄 Próximos Passos

1. Implementar ContentDetector
2. Implementar TextProcessor
3. Integrar com ImageProcessor existente
4. Testar com posts reais de diferentes formatos
5. Avaliar necessidade de VideoProcessor
6. Otimizar baseado em métricas reais
