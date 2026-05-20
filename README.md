# Agenda Cultural Salvador — Scraper

Backend responsável por buscar eventos culturais e restaurantes de múltiplas fontes e salvar no Supabase.

## Scrapers

### Eventos

| Fonte | Arquivo | Eventos | Status |
|-------|---------|---------|--------|
| **Sympla** | `src/sympla.ts` | ~425 | ✅ Ativo |
| **El Cabong** | `src/elcabong.ts` | ~170 | ✅ Ativo |
| **salvadordabahia.com** | `src/salvadordabahia.ts` | ~83 | ✅ Ativo |
| **Instagram Vision** | `src/instagram-vision.ts` | ~35 | ✅ Ativo |
| **Instagram Apify** | `src/instagram-apify.ts` | ~35/dia | 🔄 Em desenvolvimento |

### Restaurantes

| Fonte | Arquivo | Restaurantes | Status |
|-------|---------|--------------|--------|
| **Exame Casual 2025** | `src/exame.ts` | 8 | ✅ Ativo |
| **CNN Brasil V&G** | `src/cnn-restaurants.ts` | 4 | ✅ Ativo |
| **Portal IN** | `src/portal-in.ts` | 18 | ✅ Ativo |

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
# Todos os scrapers de eventos
npm run dev

# Scraper específico
npx tsx src/sympla.ts
npx tsx src/elcabong.ts
npx tsx src/salvadordabahia.ts

# Scrapers de restaurantes
npx tsx src/exame.ts
npx tsx src/cnn-restaurants.ts
npx tsx src/portal-in.ts

# Apenas build
npm run build
```

## Estrutura

```
src/
├── index.ts                    # Orquestrador principal
├── sympla.ts                   # Scraper Sympla
├── elcabong.ts                 # Scraper El Cabong
├── salvadordabahia.ts          # Scraper salvadordabahia.com
├── instagram-vision.ts          # Scraper Instagram (Gemini Vision)
├── instagram-apify.ts          # Scraper Instagram (Apify)
├── exame.ts                    # Scraper Exame Casual 2025 (restaurantes)
├── cnn-restaurants.ts          # Scraper CNN Brasil V&G (restaurantes)
├── portal-in.ts                # Scraper Portal IN (restaurantes)
├── supabase.ts                  # Cliente Supabase
└── types.ts                     # Tipos principais

scripts/                         # Scripts utilitários
├── run-sympla.ts              # Executa scraper Sympla
├── run-elcabong.ts            # Executa scraper El Cabong
├── run-salvadordabahia.ts     # Executa scraper salvadordabahia
└── run-instagram.ts           # Executa scraper Instagram

tests/                           # Scripts de teste
cache/                           # Cache local (gitignored)
docs/                            # Documentação técnica
migrations/                      # Migrations SQL
```

## Deploy

GitHub Actions roda diariamente às **03:00 BRT**:
- `.github/workflows/scrape.yml`

## Database

Supabase (compartilhado com `agenda-cultural-web`):
- `events` — todos os eventos
- `restaurants` — restaurantes curados
- `scrape_runs` — histórico de execuções

## Notas

- Scraper é idempotente: upsert por `(source, external_id)`
- Métricas registradas em `scrape_runs`
- Cache local em `cache/` (ignorado pelo Git)

## Fontes de Restaurantes

### Exame Casual 2025
- Ranking nacional dos melhores restaurantes de Salvador
- 8 restaurantes com ranking, descrição detalhada, preço médio
- URL: https://exame.com/casual/os-melhores-restaurantes-de-salvador-segundo-ranking-exame-casual-2025/

### CNN Brasil V&G
- Curadoria local de Felipe Almeida
- 7 restaurantes com descrição, horário, Instagram
- URL: https://www.cnnbrasil.com.br/viagemegastronomia/gastronomia/onde-comer-em-salvador-7-restaurantes-para-conhecer-na-capital-baiana/

### Portal IN
- Novos restaurantes abertos em 2025
- 20 restaurantes com bairro, tipo de cozinha, Instagram
- URL: https://www.portalin.com.br/notas/conheca-20-novos-restaurantes-para-saborear-em-salvador/
