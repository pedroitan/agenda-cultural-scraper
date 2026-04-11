# 🏗️ Arquitetura Modular - Instagram Scraper com Apify

## 📋 Visão Geral

Sistema modular e escalável para scraping de eventos do Instagram usando Apify, com arquitetura que permite fácil adição de novos scrapers e gerenciamento unificado via dashboard.

## 🎯 Objetivos

1. **Modularidade:** Cada scraper é um módulo independente
2. **Reutilização:** Componentes compartilhados entre scrapers
3. **Escalabilidade:** Fácil adição de novos scrapers
4. **Monitoramento:** Dashboard unificado para todos os scrapers
5. **Manutenibilidade:** Código organizado e bem documentado

## 🏛️ Arquitetura Proposta

```
agenda-cultural-scraper/
├── src/
│   ├── core/                          # Componentes compartilhados
│   │   ├── base-scraper.ts           # Classe base abstrata
│   │   ├── scraper-registry.ts       # Registro de scrapers
│   │   ├── metrics-collector.ts      # Coleta de métricas
│   │   └── error-handler.ts          # Tratamento de erros
│   │
│   ├── scrapers/                      # Scrapers individuais
│   │   ├── sympla/
│   │   │   ├── index.ts              # Scraper Sympla
│   │   │   ├── parser.ts             # Parser específico
│   │   │   └── config.ts             # Configurações
│   │   │
│   │   ├── elcabong/
│   │   │   ├── index.ts
│   │   │   ├── parser.ts
│   │   │   └── config.ts
│   │   │
│   │   ├── instagram-apify/          # NOVO: Instagram com Apify
│   │   │   ├── index.ts              # Scraper principal
│   │   │   ├── apify-client.ts       # Cliente Apify
│   │   │   ├── post-parser.ts        # Parser de posts
│   │   │   ├── image-processor.ts    # Processamento de imagens
│   │   │   ├── gemini-extractor.ts   # Extração com Gemini
│   │   │   └── config.ts             # Configurações
│   │   │
│   │   └── instagram-vision/         # EXISTENTE: Instagram Vision
│   │       ├── index.ts
│   │       └── ...
│   │
│   ├── adapters/                      # Adaptadores externos
│   │   ├── apify-adapter.ts          # Adaptador Apify
│   │   ├── gemini-adapter.ts         # Adaptador Gemini
│   │   └── supabase-adapter.ts       # Adaptador Supabase
│   │
│   ├── utils/                         # Utilitários
│   │   ├── date-parser.ts            # Parse de datas
│   │   ├── text-cleaner.ts           # Limpeza de texto
│   │   ├── image-downloader.ts       # Download de imagens
│   │   └── validators.ts             # Validações
│   │
│   ├── types/                         # Tipos TypeScript
│   │   ├── scraper.types.ts          # Tipos de scrapers
│   │   ├── event.types.ts            # Tipos de eventos
│   │   └── apify.types.ts            # Tipos Apify
│   │
│   └── index.ts                       # Entry point principal
│
├── config/
│   ├── scrapers.config.ts            # Configuração de scrapers
│   └── apify.config.ts               # Configuração Apify
│
└── docs/
    ├── INSTAGRAM-APIFY-ARCHITECTURE.md
    ├── ADDING-NEW-SCRAPER.md
    └── APIFY-SETUP.md
```

## 🔧 Componentes Core

### 1. BaseScraper (Classe Abstrata)

```typescript
// src/core/base-scraper.ts
export abstract class BaseScraper {
  protected source: string
  protected config: ScraperConfig
  protected metrics: MetricsCollector

  constructor(source: string, config: ScraperConfig) {
    this.source = source
    this.config = config
    this.metrics = new MetricsCollector(source)
  }

  // Métodos abstratos que cada scraper deve implementar
  abstract scrape(input: ScraperInput): Promise<ScrapeResult>
  abstract validate(event: any): boolean
  abstract transform(rawEvent: any): EventInput

  // Métodos compartilhados
  async run(input: ScraperInput): Promise<ScrapeResult> {
    const runId = await this.createRun(input)
    
    try {
      this.metrics.start()
      const result = await this.scrape(input)
      this.metrics.end()
      
      await this.finalizeRun(runId, 'success', result)
      return result
    } catch (error) {
      await this.finalizeRun(runId, 'failed', error)
      throw error
    }
  }

  protected async createRun(input: ScraperInput): Promise<string> {
    // Lógica compartilhada de criação de run
  }

  protected async finalizeRun(runId: string, status: string, data: any): Promise<void> {
    // Lógica compartilhada de finalização
  }
}
```

### 2. ScraperRegistry

```typescript
// src/core/scraper-registry.ts
export class ScraperRegistry {
  private scrapers: Map<string, BaseScraper> = new Map()

  register(name: string, scraper: BaseScraper): void {
    this.scrapers.set(name, scraper)
  }

  get(name: string): BaseScraper | undefined {
    return this.scrapers.get(name)
  }

  getAll(): BaseScraper[] {
    return Array.from(this.scrapers.values())
  }

  getEnabled(): BaseScraper[] {
    return this.getAll().filter(s => s.isEnabled())
  }
}
```

### 3. MetricsCollector

```typescript
// src/core/metrics-collector.ts
export class MetricsCollector {
  private source: string
  private startTime?: number
  private metrics: RunMetrics = {
    items_fetched: 0,
    items_valid: 0,
    items_invalid: 0,
    items_upserted: 0,
  }

  constructor(source: string) {
    this.source = source
  }

  start(): void {
    this.startTime = Date.now()
  }

  end(): void {
    const duration = Date.now() - (this.startTime || 0)
    console.log(`[${this.source}] Duration: ${duration}ms`)
  }

  increment(metric: keyof RunMetrics, value: number = 1): void {
    this.metrics[metric] += value
  }

  getMetrics(): RunMetrics {
    return { ...this.metrics }
  }
}
```

## 📱 Instagram Scraper com Apify

### Fluxo de Funcionamento

```
1. Apify Actor busca posts do Instagram
   ↓
2. Download de imagens dos posts
   ↓
3. Gemini Vision extrai eventos das imagens
   ↓
4. Parser transforma em EventInput
   ↓
5. Validação e limpeza
   ↓
6. Upsert no Supabase
   ↓
7. Métricas e logs
```

### Implementação

```typescript
// src/scrapers/instagram-apify/index.ts
import { BaseScraper } from '../../core/base-scraper.js'
import { ApifyClient } from './apify-client.js'
import { GeminiExtractor } from './gemini-extractor.js'
import { PostParser } from './post-parser.js'

export class InstagramApifyScraper extends BaseScraper {
  private apifyClient: ApifyClient
  private geminiExtractor: GeminiExtractor
  private postParser: PostParser

  constructor(config: InstagramScraperConfig) {
    super('instagram-apify', config)
    this.apifyClient = new ApifyClient(config.apifyToken)
    this.geminiExtractor = new GeminiExtractor(config.geminiApiKey)
    this.postParser = new PostParser()
  }

  async scrape(input: ScraperInput): Promise<ScrapeResult> {
    const valid: EventInput[] = []
    let invalid_count = 0

    // 1. Buscar posts via Apify
    const posts = await this.apifyClient.getInstagramPosts({
      username: this.config.instagramUsername,
      maxPosts: this.config.maxPosts || 20,
    })

    this.metrics.increment('items_fetched', posts.length)

    // 2. Processar cada post
    for (const post of posts) {
      try {
        // 2.1. Baixar imagens do post
        const images = await this.downloadImages(post.images)

        // 2.2. Extrair eventos com Gemini Vision
        const events = await this.geminiExtractor.extractEvents(images)

        // 2.3. Transformar e validar
        for (const event of events) {
          if (this.validate(event)) {
            const transformed = this.transform(event, post)
            valid.push(transformed)
            this.metrics.increment('items_valid')
          } else {
            invalid_count++
            this.metrics.increment('items_invalid')
          }
        }
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error)
        invalid_count++
        this.metrics.increment('items_invalid')
      }
    }

    return {
      valid,
      invalid_count,
      items_fetched: posts.length,
    }
  }

  validate(event: any): boolean {
    return !!(
      event.title &&
      event.date &&
      event.time &&
      event.venue
    )
  }

  transform(event: any, post: any): EventInput {
    return this.postParser.toEventInput(event, post, this.source)
  }

  private async downloadImages(imageUrls: string[]): Promise<Buffer[]> {
    // Implementação de download de imagens
  }
}
```

### Apify Client

```typescript
// src/scrapers/instagram-apify/apify-client.ts
import { ApifyClient as ApifySDK } from 'apify-client'

export class ApifyClient {
  private client: ApifySDK

  constructor(token: string) {
    this.client = new ApifySDK({ token })
  }

  async getInstagramPosts(options: {
    username: string
    maxPosts: number
  }): Promise<InstagramPost[]> {
    // Usar Apify Actor para Instagram
    // Exemplo: apify/instagram-profile-scraper
    const run = await this.client.actor('apify/instagram-profile-scraper').call({
      usernames: [options.username],
      resultsLimit: options.maxPosts,
      resultsType: 'posts',
    })

    const { items } = await this.client.dataset(run.defaultDatasetId).listItems()
    
    return items.map(item => ({
      id: item.id,
      caption: item.caption,
      images: item.displayUrl ? [item.displayUrl] : [],
      timestamp: item.timestamp,
      url: item.url,
    }))
  }
}
```

### Gemini Extractor

```typescript
// src/scrapers/instagram-apify/gemini-extractor.ts
import { extractEventsFromImage } from '../../utils/gemini-vision.js'

export class GeminiExtractor {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async extractEvents(images: Buffer[]): Promise<ExtractedEvent[]> {
    const allEvents: ExtractedEvent[] = []
    let previousDate: string | undefined

    for (const imageBuffer of images) {
      const events = await extractEventsFromImage(
        imageBuffer,
        'image/jpeg',
        previousDate
      )

      if (events.length > 0) {
        allEvents.push(...events)
        previousDate = events[events.length - 1].date
      }
    }

    return allEvents
  }
}
```

## 🎛️ Configuração

```typescript
// config/scrapers.config.ts
export const scrapersConfig = {
  sympla: {
    enabled: true,
    maxEvents: 500,
  },
  elcabong: {
    enabled: true,
    maxEvents: 200,
  },
  'instagram-apify': {
    enabled: true,
    instagramUsername: 'agendaalternativasalvador',
    maxPosts: 20,
    apifyToken: process.env.APIFY_TOKEN,
    geminiApiKey: process.env.GEMINI_API_KEY,
  },
  'instagram-vision': {
    enabled: false, // Desabilitar em favor do Apify
  },
}
```

## 📊 Dashboard Unificado

### Melhorias no Dashboard Admin

```typescript
// Adicionar ao dashboard existente
interface ScraperStatus {
  name: string
  enabled: boolean
  lastRun?: {
    status: 'success' | 'failed' | 'running'
    timestamp: string
    metrics: RunMetrics
  }
  nextRun?: string
  health: 'healthy' | 'warning' | 'error'
}

// Endpoint para status de todos os scrapers
GET /api/scrapers/status
Response: ScraperStatus[]

// Endpoint para executar scraper específico
POST /api/scrapers/:name/run
Response: { runId: string, status: 'started' }

// Endpoint para habilitar/desabilitar scraper
PATCH /api/scrapers/:name/toggle
Body: { enabled: boolean }
```

### Componente ScrapersManager

```tsx
// app/admin/scrapers/ScrapersManager.tsx
export function ScrapersManager() {
  const [scrapers, setScrapers] = useState<ScraperStatus[]>([])

  return (
    <div className="grid gap-4">
      {scrapers.map(scraper => (
        <ScraperCard
          key={scraper.name}
          scraper={scraper}
          onRun={() => runScraper(scraper.name)}
          onToggle={() => toggleScraper(scraper.name)}
        />
      ))}
    </div>
  )
}
```

## 🔄 Processo de Adição de Novo Scraper

1. **Criar pasta do scraper:**
   ```
   src/scrapers/novo-scraper/
   ├── index.ts
   ├── parser.ts
   └── config.ts
   ```

2. **Implementar classe que estende BaseScraper:**
   ```typescript
   export class NovoScraper extends BaseScraper {
     async scrape(input: ScraperInput): Promise<ScrapeResult> {
       // Implementação
     }
     validate(event: any): boolean { }
     transform(rawEvent: any): EventInput { }
   }
   ```

3. **Registrar no registry:**
   ```typescript
   // src/index.ts
   registry.register('novo-scraper', new NovoScraper(config))
   ```

4. **Adicionar configuração:**
   ```typescript
   // config/scrapers.config.ts
   'novo-scraper': {
     enabled: true,
     // configurações específicas
   }
   ```

5. **Atualizar tipos:**
   ```typescript
   // src/types.ts
   type ScraperSource = 'sympla' | 'elcabong' | 'instagram-apify' | 'novo-scraper'
   ```

## 📈 Métricas e Monitoramento

### Métricas Coletadas

- **Por Scraper:**
  - Items fetched (total buscado)
  - Items valid (válidos)
  - Items invalid (inválidos)
  - Items upserted (inseridos/atualizados)
  - Duration (duração)
  - Success rate (taxa de sucesso)

- **Globais:**
  - Total events in database
  - Events by source
  - Last 7 days activity
  - Error rate by scraper

### Alertas

- Scraper failed 3 times consecutively
- No events fetched in last run
- Duration > 10 minutes
- Error rate > 20%

## 🚀 Próximos Passos

### Fase 1: Estrutura Base (1-2 dias)
- [ ] Criar estrutura de pastas
- [ ] Implementar BaseScraper
- [ ] Implementar ScraperRegistry
- [ ] Implementar MetricsCollector
- [ ] Migrar scrapers existentes para nova estrutura

### Fase 2: Instagram Apify (2-3 dias)
- [ ] Setup Apify account e token
- [ ] Implementar ApifyClient
- [ ] Implementar InstagramApifyScraper
- [ ] Integrar com Gemini Vision existente
- [ ] Testes locais

### Fase 3: Dashboard Unificado (1-2 dias)
- [ ] Criar endpoints de API
- [ ] Implementar ScrapersManager component
- [ ] Adicionar controles de enable/disable
- [ ] Adicionar botão de run manual
- [ ] Melhorar visualização de métricas

### Fase 4: Testes e Deploy (1 dia)
- [ ] Testes end-to-end
- [ ] Documentação
- [ ] Deploy para produção
- [ ] Monitoramento inicial

## 📚 Recursos

- **Apify Docs:** https://docs.apify.com
- **Instagram Profile Scraper:** https://apify.com/apify/instagram-profile-scraper
- **Gemini Vision API:** https://ai.google.dev/gemini-api/docs/vision
- **Supabase Docs:** https://supabase.com/docs

## ✅ Benefícios da Arquitetura

1. **Modularidade:** Cada scraper é independente
2. **Reutilização:** Código compartilhado via BaseScraper
3. **Testabilidade:** Fácil testar cada componente
4. **Escalabilidade:** Adicionar novos scrapers é simples
5. **Manutenibilidade:** Código organizado e documentado
6. **Monitoramento:** Dashboard unificado para todos
7. **Flexibilidade:** Habilitar/desabilitar scrapers facilmente
