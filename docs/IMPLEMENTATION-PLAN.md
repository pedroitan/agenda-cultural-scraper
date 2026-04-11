# 🚀 Plano de Implementação - Instagram Scraper com Apify

## 📋 Resumo Executivo

Implementação de scraper Instagram usando Apify com arquitetura modular que permite fácil adição de novos scrapers e gerenciamento unificado.

**Tempo estimado:** 6-8 dias  
**Complexidade:** Média  
**Dependências:** Apify, Gemini Vision API, Supabase

---

## 🎯 Fase 1: Estrutura Base (Dias 1-2)

### Objetivo
Criar a infraestrutura modular que será reutilizada por todos os scrapers.

### Tarefas

#### 1.1 Criar estrutura de pastas
```bash
mkdir -p src/core
mkdir -p src/scrapers/instagram-apify
mkdir -p src/adapters
mkdir -p src/utils
mkdir -p src/types
mkdir -p config
```

#### 1.2 Implementar tipos compartilhados
**Arquivo:** `src/types/scraper.types.ts`

```typescript
export interface ScraperConfig {
  enabled: boolean
  maxRetries?: number
  timeout?: number
  [key: string]: any
}

export interface ScrapeResult {
  valid: EventInput[]
  invalid_count: number
  items_fetched: number
}

export interface RunMetrics {
  items_fetched: number
  items_valid: number
  items_invalid: number
  items_upserted: number
  duration_ms?: number
}

export type ScraperSource = 
  | 'sympla' 
  | 'elcabong' 
  | 'instagram-apify' 
  | 'instagram-vision'
```

#### 1.3 Implementar BaseScraper
**Arquivo:** `src/core/base-scraper.ts`

```typescript
import { supabase } from '../supabase.js'
import type { ScraperInput, ScrapeResult, ScraperConfig, RunMetrics } from '../types/index.js'

export abstract class BaseScraper {
  protected source: string
  protected config: ScraperConfig
  protected metrics: RunMetrics

  constructor(source: string, config: ScraperConfig) {
    this.source = source
    this.config = config
    this.metrics = {
      items_fetched: 0,
      items_valid: 0,
      items_invalid: 0,
      items_upserted: 0,
    }
  }

  // Métodos abstratos - cada scraper implementa
  abstract scrape(input: ScraperInput): Promise<ScrapeResult>
  abstract validate(event: any): boolean
  abstract transform(rawEvent: any): EventInput

  // Método principal - compartilhado
  async run(input: ScraperInput): Promise<ScrapeResult> {
    if (!this.config.enabled) {
      console.log(`[${this.source}] Scraper disabled, skipping...`)
      return { valid: [], invalid_count: 0, items_fetched: 0 }
    }

    const runId = await this.createRun(input)
    const startTime = Date.now()

    try {
      console.log(`[${this.source}] Starting scrape...`)
      
      const result = await this.scrape(input)
      
      this.metrics.items_fetched = result.items_fetched
      this.metrics.items_valid = result.valid.length
      this.metrics.items_invalid = result.invalid_count
      this.metrics.duration_ms = Date.now() - startTime

      // Upsert events
      this.metrics.items_upserted = await this.upsertEvents(result.valid)

      await this.finalizeRun(runId, 'success', this.metrics)
      
      console.log(`[${this.source}] Completed successfully:`, this.metrics)
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.finalizeRun(runId, 'failed', this.metrics, errorMessage)
      
      console.error(`[${this.source}] Failed:`, errorMessage)
      throw error
    }
  }

  protected async createRun(input: ScraperInput): Promise<string> {
    const { data, error } = await supabase
      .from('scrape_runs')
      .insert({
        source: this.source,
        city: input.city,
        status: 'running',
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  protected async finalizeRun(
    runId: string,
    status: 'success' | 'failed',
    metrics: RunMetrics,
    errorMessage?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('scrape_runs')
      .update({
        status,
        ended_at: new Date().toISOString(),
        items_fetched: metrics.items_fetched,
        items_valid: metrics.items_valid,
        items_invalid: metrics.items_invalid,
        items_upserted: metrics.items_upserted,
        error_message: errorMessage || null,
      })
      .eq('id', runId)

    if (error) throw error
  }

  protected async upsertEvents(events: EventInput[]): Promise<number> {
    if (events.length === 0) return 0

    const { error } = await supabase
      .from('events')
      .upsert(events, {
        onConflict: 'source,external_id',
        ignoreDuplicates: false,
      })

    if (error) throw error
    return events.length
  }

  isEnabled(): boolean {
    return this.config.enabled
  }
}
```

#### 1.4 Implementar ScraperRegistry
**Arquivo:** `src/core/scraper-registry.ts`

```typescript
import type { BaseScraper } from './base-scraper.js'

export class ScraperRegistry {
  private scrapers: Map<string, BaseScraper> = new Map()

  register(name: string, scraper: BaseScraper): void {
    this.scrapers.set(name, scraper)
    console.log(`✅ Registered scraper: ${name}`)
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

  list(): string[] {
    return Array.from(this.scrapers.keys())
  }
}
```

#### 1.5 Migrar scrapers existentes
**Arquivo:** `src/scrapers/sympla/index.ts`

```typescript
import { BaseScraper } from '../../core/base-scraper.js'
import { runSymplaScrape } from '../../sympla.js' // código existente

export class SymplaScraper extends BaseScraper {
  constructor(config: ScraperConfig) {
    super('sympla', config)
  }

  async scrape(input: ScraperInput): Promise<ScrapeResult> {
    // Usar código existente
    return await runSymplaScrape(input)
  }

  validate(event: any): boolean {
    return true // Já validado no código existente
  }

  transform(rawEvent: any): EventInput {
    return rawEvent // Já transformado no código existente
  }
}
```

**Repetir para ElCabong e Instagram Vision**

#### 1.6 Atualizar index.ts principal
**Arquivo:** `src/index.ts`

```typescript
import 'dotenv/config'
import { z } from 'zod'
import { ScraperRegistry } from './core/scraper-registry.js'
import { SymplaScraper } from './scrapers/sympla/index.js'
import { ElCabongScraper } from './scrapers/elcabong/index.js'
import { InstagramVisionScraper } from './scrapers/instagram-vision/index.js'
import { scrapersConfig } from '../config/scrapers.config.js'

const EnvSchema = z.object({
  SCRAPE_CITY: z.literal('salvador').default('salvador'),
  SCRAPE_UNTIL_DAYS: z.coerce.number().int().positive().default(90),
})

async function main() {
  const env = EnvSchema.parse(process.env)
  const registry = new ScraperRegistry()

  // Registrar scrapers
  registry.register('sympla', new SymplaScraper(scrapersConfig.sympla))
  registry.register('elcabong', new ElCabongScraper(scrapersConfig.elcabong))
  registry.register('instagram-vision', new InstagramVisionScraper(scrapersConfig['instagram-vision']))

  // Executar apenas scrapers habilitados
  const enabledScrapers = registry.getEnabled()
  
  console.log(`\n🚀 Running ${enabledScrapers.length} enabled scrapers\n`)

  for (const scraper of enabledScrapers) {
    const input = {
      source: scraper.source,
      city: env.SCRAPE_CITY,
      untilDays: env.SCRAPE_UNTIL_DAYS,
    }

    await scraper.run(input)
  }

  console.log('\n✅ All scrapers completed\n')
}

await main()
```

**✅ Checkpoint Fase 1:** Scrapers existentes funcionando com nova arquitetura

---

## 🎯 Fase 2: Instagram Apify (Dias 3-5)

### Objetivo
Implementar scraper Instagram usando Apify para buscar posts e Gemini Vision para extrair eventos.

### Tarefas

#### 2.1 Setup Apify

1. **Criar conta Apify:**
   - Acesse: https://console.apify.com
   - Crie conta gratuita (500 platform credits/mês)

2. **Obter API Token:**
   - Settings > Integrations > API tokens
   - Criar novo token: "agenda-cultural-scraper"
   - Copiar token

3. **Adicionar ao .env:**
```bash
APIFY_TOKEN=apify_api_xxxxxxxxxxxxx
```

4. **Instalar SDK:**
```bash
npm install apify-client
```

#### 2.2 Implementar ApifyAdapter
**Arquivo:** `src/adapters/apify-adapter.ts`

```typescript
import { ApifyClient } from 'apify-client'

export interface InstagramPost {
  id: string
  caption: string
  images: string[]
  timestamp: string
  url: string
  likesCount?: number
  commentsCount?: number
}

export class ApifyAdapter {
  private client: ApifyClient

  constructor(token: string) {
    this.client = new ApifyClient({ token })
  }

  async getInstagramPosts(options: {
    username: string
    maxPosts: number
  }): Promise<InstagramPost[]> {
    console.log(`📱 Fetching Instagram posts for @${options.username}...`)

    try {
      // Usar Instagram Profile Scraper
      const run = await this.client.actor('apify/instagram-profile-scraper').call({
        usernames: [options.username],
        resultsLimit: options.maxPosts,
        resultsType: 'posts',
      })

      console.log(`⏳ Waiting for Apify run to complete...`)
      
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems()
      
      console.log(`✅ Fetched ${items.length} posts from Instagram`)

      return items.map(item => ({
        id: item.id || item.shortCode,
        caption: item.caption || '',
        images: this.extractImages(item),
        timestamp: item.timestamp,
        url: item.url,
        likesCount: item.likesCount,
        commentsCount: item.commentsCount,
      }))
    } catch (error) {
      console.error('❌ Apify error:', error)
      throw new Error(`Failed to fetch Instagram posts: ${error}`)
    }
  }

  private extractImages(item: any): string[] {
    const images: string[] = []
    
    // Imagem principal
    if (item.displayUrl) {
      images.push(item.displayUrl)
    }
    
    // Carrossel de imagens
    if (item.images && Array.isArray(item.images)) {
      images.push(...item.images)
    }
    
    return images
  }
}
```

#### 2.3 Implementar Image Downloader
**Arquivo:** `src/utils/image-downloader.ts`

```typescript
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function downloadImages(urls: string[]): Promise<Buffer[]> {
  const downloads = urls.map(url => downloadImage(url))
  return await Promise.all(downloads)
}
```

#### 2.4 Implementar InstagramApifyScraper
**Arquivo:** `src/scrapers/instagram-apify/index.ts`

```typescript
import { BaseScraper } from '../../core/base-scraper.js'
import { ApifyAdapter } from '../../adapters/apify-adapter.js'
import { extractEventsFromImage } from '../../utils/gemini-vision.js'
import { downloadImages } from '../../utils/image-downloader.js'
import type { ScraperInput, ScrapeResult, EventInput } from '../../types/index.js'

export class InstagramApifyScraper extends BaseScraper {
  private apifyAdapter: ApifyAdapter
  private instagramUsername: string
  private maxPosts: number

  constructor(config: any) {
    super('instagram-apify', config)
    this.apifyAdapter = new ApifyAdapter(config.apifyToken)
    this.instagramUsername = config.instagramUsername
    this.maxPosts = config.maxPosts || 20
  }

  async scrape(input: ScraperInput): Promise<ScrapeResult> {
    const valid: EventInput[] = []
    let invalid_count = 0

    // 1. Buscar posts via Apify
    const posts = await this.apifyAdapter.getInstagramPosts({
      username: this.instagramUsername,
      maxPosts: this.maxPosts,
    })

    console.log(`📸 Processing ${posts.length} Instagram posts...`)

    // 2. Processar cada post
    let previousDate: string | undefined

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      console.log(`\n[${i + 1}/${posts.length}] Processing post ${post.id}`)

      try {
        // 2.1. Download de imagens
        if (post.images.length === 0) {
          console.log('  ⏭️  No images, skipping...')
          continue
        }

        console.log(`  📥 Downloading ${post.images.length} image(s)...`)
        const imageBuffers = await downloadImages(post.images)

        // 2.2. Extrair eventos com Gemini Vision
        console.log(`  🤖 Extracting events with Gemini Vision...`)
        
        for (const imageBuffer of imageBuffers) {
          const events = await extractEventsFromImage(
            imageBuffer,
            'image/jpeg',
            previousDate
          )

          console.log(`  ✅ Extracted ${events.length} event(s)`)

          // 2.3. Transformar e validar
          for (const event of events) {
            if (this.validate(event)) {
              const transformed = this.transform(event, post)
              valid.push(transformed)
              previousDate = event.date
            } else {
              console.log(`  ⚠️  Invalid event: ${event.title}`)
              invalid_count++
            }
          }
        }
      } catch (error) {
        console.error(`  ❌ Error processing post:`, error)
        invalid_count++
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
    // Parse date DD/MM/YYYY to ISO
    const [day, month, year] = event.date.split('/')
    const [hour, minute] = event.time.split(':')
    const startDatetime = `${year}-${month}-${day}T${hour}:${minute}:00`

    // Determine category
    const category = this.categorizeEvent(event.title, event.description)

    // Check if free
    const isFree = event.price.toLowerCase().includes('grátis') || 
                   event.price.toLowerCase().includes('gratuito')

    return {
      source: this.source,
      external_id: `instagram-apify-${Buffer.from(event.title + event.date).toString('base64').slice(0, 20)}`,
      title: event.title,
      start_datetime: startDatetime,
      city: 'Salvador',
      venue_name: event.venue,
      price_text: event.price !== 'Consulte' ? event.price : undefined,
      category,
      is_free: isFree,
      url: post.url,
      image_url: post.images[0], // Primeira imagem do post
      raw_payload: { event, post },
    }
  }

  private categorizeEvent(title: string, description?: string): string {
    const text = `${title} ${description || ''}`.toLowerCase()

    if (text.match(/show|música|festival|concert|samba|pagode|rock|jazz|mpb/)) {
      return 'Shows e Festas'
    }
    if (text.match(/teatro|peça|espetáculo|drama|comédia/)) {
      return 'Teatro'
    }
    if (text.match(/arte|exposição|galeria|museu|cultura/)) {
      return 'Arte e Cultura'
    }
    if (text.match(/gastronomia|culinária|restaurante|food|comida/)) {
      return 'Gastronomia'
    }

    return 'Shows e Festas' // Default
  }
}
```

#### 2.5 Adicionar configuração
**Arquivo:** `config/scrapers.config.ts`

```typescript
export const scrapersConfig = {
  sympla: {
    enabled: true,
  },
  elcabong: {
    enabled: true,
  },
  'instagram-vision': {
    enabled: false, // Desabilitar em favor do Apify
  },
  'instagram-apify': {
    enabled: true,
    instagramUsername: 'agendaalternativasalvador',
    maxPosts: 20,
    apifyToken: process.env.APIFY_TOKEN!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
  },
}
```

#### 2.6 Registrar no index.ts
```typescript
import { InstagramApifyScraper } from './scrapers/instagram-apify/index.js'

// No main():
registry.register('instagram-apify', new InstagramApifyScraper(scrapersConfig['instagram-apify']))
```

**✅ Checkpoint Fase 2:** Instagram Apify funcionando e extraindo eventos

---

## 🎯 Fase 3: Dashboard Unificado (Dias 6-7)

### Objetivo
Criar interface administrativa para gerenciar todos os scrapers de forma unificada.

### Tarefas

#### 3.1 Criar API Routes

**Arquivo:** `app/api/scrapers/status/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Buscar último run de cada scraper
  const { data: runs } = await supabase
    .from('scrape_runs')
    .select('*')
    .order('started_at', { ascending: false })

  // Agrupar por source
  const scraperStatus = {}
  
  for (const run of runs || []) {
    if (!scraperStatus[run.source]) {
      scraperStatus[run.source] = {
        name: run.source,
        lastRun: {
          status: run.status,
          timestamp: run.started_at,
          metrics: {
            items_fetched: run.items_fetched,
            items_valid: run.items_valid,
            items_upserted: run.items_upserted,
          },
        },
      }
    }
  }

  return NextResponse.json(Object.values(scraperStatus))
}
```

#### 3.2 Criar componente ScrapersManager

**Arquivo:** `app/admin/scrapers/ScrapersManager.tsx`
```typescript
'use client'

import { useState, useEffect } from 'react'

interface ScraperStatus {
  name: string
  lastRun?: {
    status: string
    timestamp: string
    metrics: any
  }
}

export function ScrapersManager() {
  const [scrapers, setScrapers] = useState<ScraperStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScrapers()
  }, [])

  async function fetchScrapers() {
    const res = await fetch('/api/scrapers/status')
    const data = await res.json()
    setScrapers(data)
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Scrapers</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scrapers.map(scraper => (
          <ScraperCard key={scraper.name} scraper={scraper} />
        ))}
      </div>
    </div>
  )
}

function ScraperCard({ scraper }: { scraper: ScraperStatus }) {
  const statusColor = {
    success: 'bg-green-500',
    failed: 'bg-red-500',
    running: 'bg-yellow-500',
  }[scraper.lastRun?.status || 'failed']

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold capitalize">{scraper.name}</h3>
        <div className={`w-3 h-3 rounded-full ${statusColor}`} />
      </div>
      
      {scraper.lastRun && (
        <div className="text-sm text-gray-600">
          <p>Last run: {new Date(scraper.lastRun.timestamp).toLocaleString()}</p>
          <p>Fetched: {scraper.lastRun.metrics.items_fetched}</p>
          <p>Valid: {scraper.lastRun.metrics.items_valid}</p>
          <p>Upserted: {scraper.lastRun.metrics.items_upserted}</p>
        </div>
      )}
    </div>
  )
}
```

#### 3.3 Adicionar ao dashboard admin

**Arquivo:** `app/admin/page.tsx`
```typescript
import { ScrapersManager } from './scrapers/ScrapersManager'

export default function AdminPage() {
  return (
    <div>
      {/* Conteúdo existente */}
      
      <section className="mt-8">
        <ScrapersManager />
      </section>
    </div>
  )
}
```

**✅ Checkpoint Fase 3:** Dashboard mostrando status de todos os scrapers

---

## 🎯 Fase 4: Testes e Deploy (Dia 8)

### Tarefas

#### 4.1 Testes Locais
```bash
# Testar scraper individual
npm run scrape

# Verificar logs
# Verificar eventos no Supabase
```

#### 4.2 Atualizar GitHub Actions
**Arquivo:** `.github/workflows/daily-scrape.yml`
```yaml
# Adicionar variável de ambiente
env:
  APIFY_TOKEN: ${{ secrets.APIFY_TOKEN }}
```

#### 4.3 Configurar Secrets no GitHub
- Settings > Secrets > Actions
- Adicionar: `APIFY_TOKEN`

#### 4.4 Deploy e Monitoramento
- Commit e push
- Verificar GitHub Actions
- Monitorar primeiro run automático
- Validar eventos no dashboard

---

## ✅ Checklist Final

- [ ] Estrutura base implementada
- [ ] Scrapers existentes migrados
- [ ] Apify configurado
- [ ] Instagram Apify funcionando
- [ ] Dashboard unificado criado
- [ ] Testes locais passando
- [ ] GitHub Actions atualizado
- [ ] Secrets configurados
- [ ] Documentação completa
- [ ] Deploy em produção
- [ ] Monitoramento ativo

---

## 📊 Métricas de Sucesso

- Instagram Apify extrai >= 50 eventos por run
- Taxa de sucesso >= 90%
- Tempo de execução < 10 minutos
- Zero duplicação de eventos
- Dashboard mostra status em tempo real

---

## 🆘 Troubleshooting

### Apify retorna poucos posts
- Aumentar `maxPosts` na config
- Verificar se conta está ativa
- Checar créditos disponíveis

### Gemini Vision falha
- Verificar API key
- Checar quota
- Validar formato das imagens

### Eventos duplicados
- Verificar `external_id` único
- Confirmar `onConflict` correto

---

## 📚 Próximos Passos Futuros

1. Adicionar mais fontes (Eventbrite, Ticketmaster)
2. Implementar retry automático em falhas
3. Adicionar alertas via email/Slack
4. Criar página de configuração no dashboard
5. Implementar agendamento customizado por scraper
