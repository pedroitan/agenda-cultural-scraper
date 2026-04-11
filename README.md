# Agenda Cultural Salvador — Scraper

Backend responsável por buscar eventos culturais de múltiplas fontes e salvar no Supabase.

## Scrapers

| Fonte | Arquivo | Eventos | Status |
|-------|---------|---------|--------|
| **Sympla** | `src/sympla.ts` | ~425 | ✅ Ativo |
| **El Cabong** | `src/elcabong.ts` | ~170 | ✅ Ativo |
| **Instagram Vision** | `src/instagram-vision.ts` | ~35 | ✅ Ativo |
| **Instagram Apify** | `src/scrapers/instagram-apify/` | ~35/dia | 🔄 Em desenvolvimento |

## Setup

1. Copie `.env.example` para `.env` e preencha as variáveis:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APIFY_TOKEN=           # Para scraper Instagram Apify
GEMINI_API_KEY=        # Para scraper Instagram Vision
```

2. Instale dependências:

```bash
npm install
```

3. Compile TypeScript:

```bash
npm run build
```

## Rodar local

```bash
# Todos os scrapers
npm run dev

# Apenas build
npm run build
```

## Estrutura

```
src/
├── index.ts                    # Orquestrador principal
├── sympla.ts                   # Scraper Sympla
├── elcabong.ts                 # Scraper El Cabong
├── instagram-vision.ts         # Scraper Instagram (Gemini Vision)
├── scrapers/
│   └── instagram-apify/        # Scraper Instagram (Apify)
│       ├── apify-adapter.ts    # Integração com Apify
│       ├── text-processor.ts   # Extração de eventos do caption
│       ├── event-aggregator.ts # Deduplicação e estatísticas
│       ├── content-detector.ts # Detecção de tipo de conteúdo
│       └── image-processor.ts  # Extração via Gemini Vision
├── types/
│   └── instagram.types.ts      # Tipos TypeScript do Instagram
├── supabase.ts                  # Cliente Supabase
└── types.ts                     # Tipos principais

scripts/                         # Sistema de cache local
├── fetch-instagram-posts.js    # Busca posts via Apify (1x/dia)
├── process-cached-posts.js     # Processa cache (sem custo)
├── list-events-by-date.js      # Lista eventos por data
├── summary-events.js           # Resumo executivo
└── view-cache.js               # Info do cache

tests/                           # Scripts de teste
cache/                           # Cache local (gitignored)
docs/                            # Documentação técnica
```

## Sistema de Cache (Instagram Apify)

Economiza créditos do Apify — busca 1x, processa N vezes:

```bash
# 1. Buscar posts via Apify (~10 créditos)
node scripts/fetch-instagram-posts.js

# 2. Processar posts do cache (0 créditos)
node scripts/process-cached-posts.js

# 3. Ver resumo
node scripts/summary-events.js
```

## Deploy

GitHub Actions roda diariamente às **03:00 BRT**:
- `.github/workflows/scrape.yml`

## Database

Supabase (compartilhado com `agenda-cultural-web`):
- `events` — todos os eventos
- `scrape_runs` — histórico de execuções

## Notas

- Scraper é idempotente: upsert por `(source, external_id)`
- Métricas registradas em `scrape_runs`
- Cache local em `cache/` (ignorado pelo Git)
