# Instagram Apify Scraper - Fase 2 (Implementado)

## 📋 Arquitetura Implementada

### Fetch Layer (Apify)
- **ApifyAdapter** - Busca posts do Instagram via `apify/instagram-scraper`
- Captura caption + comentários do autor (mensagens de continuação)
- Extrai imagens de posts e carrosséis
- Cache local para economizar créditos

### Process Layer (Local/Server)
- **MessageProcessor** (NOVO) - Trata mensagens de continuação do Instagram
  - Detecta captions truncadas ("… more", "ver mais")
  - Concatena mensagens do autor
  - Limpa ruído de menções e hashtags
  
- **TextProcessor** - Extrai eventos de captions estruturados
  - Padrões: 📍⏰💰📅 + dias da semana
  - Detecção de contexto de data
  
- **ImageProcessor** - Processa imagens via Gemini Vision
  - Download de imagens de URLs
  - Extração de eventos de imagens
  - Mantém contexto de data entre imagens

### Aggregation Layer
- **EventAggregator** - Deduplica, ordena e organiza eventos
- **InstagramApifyScraper** - Orquestrador principal

## � Estratégia de Scraping

**Conta monitorada:** @agendaalternativasalvador

**Fontes de dados:**
1. **Posts** (Apify) - Permanentes, mais conteúdo
2. **Stories** (Instagram Vision) - Mais recentes, desaparecem em 24h
3. **Mensagens** (Apify comments) - Continuação quando caption não cabe

**Estratégia anti-bloqueio:**
- Scrape de uma vez via Apify
- Filtragem e processamento local
- Cache local para reutilização sem custo

## 🚀 Como Usar

### 1. Configurar variáveis de ambiente

No `.env` do scraper:

```env
APIFY_TOKEN=seu_token_apify
GEMINI_API_KEY=sua_chave_gemini
INSTAGRAM_USERNAME=agendaalternativasalvador
INSTAGRAM_MAX_POSTS=20
USE_INSTAGRAM_APIFY=true
```

### 2. Ativar Instagram Apify

Set `USE_INSTAGRAM_APIFY=true` no `.env` para usar o novo scraper.

O scraper `instagram-vision.ts` continuará funcionando como fallback.

### 3. Rodar scraper

```bash
npm run build
npm run dev
```

## 📊 Componentes Implementados

### ✅ ApifyAdapter
- Integração com `apify/instagram-scraper`
- Captura de comentários do autor
- Download de imagens
- Verificação de créditos

### ✅ MessageProcessor (NOVO)
- Detecção de truncação de caption
- Processamento de mensagens de continuação
- Extração de eventos de mensagens individuais

### ✅ InstagramApifyScraper (NOVO)
- Orquestração de todos os processadores
- Conversão de eventos para EventInput
- Extração automática de categoria
- Métricas detalhadas

### ✅ ContentDetector
- Detecção de tipo de conteúdo
- Cálculo de quality score

### ✅ TextProcessor
- Extração de eventos de captions
- Detecção de contexto de data
- Limpeza de texto

### ✅ ImageProcessor
- Download de imagens de URLs
- Processamento via Gemini Vision
- Validação de formato/tamanho

### ✅ EventAggregator
- Deduplicação inteligente
- Ordenação cronológica
- Filtragem de eventos futuros

## 📁 Arquivos Criados/Atualizados

```
src/
├── instagram-apify.ts                    # Wrapper para integração (NOVO)
├── index.ts                              # Atualizado para usar Apify
└── scrapers/instagram-apify/
    ├── instagram-apify-scraper.ts        # Orquestrador principal (NOVO)
    ├── message-processor.ts              # Processamento de mensagens (NOVO)
    ├── apify-adapter.ts                  # Integração Apify
    ├── content-detector.ts               # Detecção de conteúdo
    ├── text-processor.ts                # Extração de texto
    ├── image-processor.ts               # Processamento de imagem
    └── event-aggregator.ts              # Agregação de eventos
```

## 🔄 Fluxo de Dados

```
Instagram (@agendaalternativasalvador)
         ↓
    Apify Scraper
         ↓
    Cache Local (JSON)
         ↓
┌─────────────────────────────┐
│ InstagramApifyScraper      │
├─────────────────────────────┤
│ 1. ApifyAdapter            │
│    - Buscar posts          │
│    - Baixar imagens        │
├─────────────────────────────┤
│ 2. MessageProcessor        │
│    - Tratar mensagens      │
├─────────────────────────────┤
│ 3. TextProcessor           │
│    - Extrair caption       │
├─────────────────────────────┤
│ 4. ImageProcessor          │
│    - Processar imagens     │
├─────────────────────────────┤
│ 5. EventAggregator         │
│    - Deduplicar            │
│    - Ordenar               │
└─────────────────────────────┘
         ↓
    Supabase (events)
```

## 🧪 Testes

Para testar o Instagram Apify Scraper:

```bash
cd agenda-cultural-scraper
npm run build
node dist/scrapers/instagram-apify/test-apify-connection.js
```

## 📈 Métricas Esperadas

| Fonte | Eventos/Post | Taxa Sucesso | Tempo |
|-------|--------------|--------------|-------|
| Caption | 5-15 | 95% | ~1s |
| Imagens | 3-8 | 85% | ~5s |
| Mensagens | 2-5 | 90% | ~1s |

**Total esperado:**
- 20 posts/dia
- 100-200 eventos/dia
- Tempo total: 5-10 minutos

## 🎯 Próximos Passos

- [x] Implementar MessageProcessor
- [x] Implementar InstagramApifyScraper
- [x] Integrar com index.ts
- [x] Compilar sem erros
- [ ] Testar com dados reais @agendaalternativasalvador
- [ ] Criar workflow GitHub Actions separado para Stories (cada 6h)
- [ ] Adicionar mais contas do Instagram (se necessário)

## 🐛 Troubleshooting

### Eventos não extraídos
- Verificar se caption tem padrões estruturados
- Checar logs de debug do TextProcessor
- Validar se Apify está capturando comentários do autor

### Imagens não processadas
- Verificar GEMINI_API_KEY
- Checar formato e tamanho das imagens
- Ver logs de erro do Gemini

### Erro de conexão Apify
- Verificar APIFY_TOKEN
- Checar créditos disponíveis
- Testar conexão manualmente

## 📝 Notas de Design

1. **Mensagens de continuação:** Apify captura comentários do autor no `latestComments`, que são concatenados ao caption
2. **Download de imagens:** URLs são convertidas para Buffers antes de passar para ImageProcessor
3. **Fallback:** Instagram Vision continua funcionando se USE_INSTAGRAM_APIFY não estiver definido
4. **Cache local:** Sistema de cache existente pode ser reutilizado para economizar créditos Apify
