# Instagram Apify Scraper - Fase 1

## 📋 Componentes Implementados

### ✅ ContentDetector
**Arquivo:** `content-detector.ts`

**Função:** Detecta o tipo de conteúdo de um post do Instagram e estima sua qualidade.

**Tipos detectados:**
- `TEXT_ONLY` - Post com caption estruturado
- `IMAGE_POST` - Post com imagem única
- `CAROUSEL` - Post com múltiplas imagens
- `IMAGE_STORY` - Story com imagem
- `VIDEO_STORY` - Story com vídeo

**Métodos:**
- `detect(post)` - Detecta tipo de conteúdo
- `estimateQuality(post, metadata)` - Retorna score 0-100 baseado em:
  - Caption estruturado (+30)
  - Múltiplas imagens (+20)
  - Idade do post (até +30)
  - Engajamento (até +20)

---

### ✅ TextProcessor
**Arquivo:** `text-processor.ts`

**Função:** Extrai eventos de captions estruturados do Instagram.

**Padrões detectados:**
- Emojis de evento: 🎭🎪🎨🎵🎸🎤
- Emojis de informação: 📍 (local), ⏰ (horário), 💰 (preço), 📅 (data)
- Dias da semana: SEXTA, SÁBADO, DOMINGO, etc.
- Horários: 19:00, 21:30, etc.
- Datas: 30/01, 31/01, etc.

**Métodos:**
- `extractEvents(caption, postUrl)` - Extrai eventos do caption
- `detectDateContext(caption)` - Detecta contexto de datas (ex: "SEXTA (30/01)")
- `cleanCaption(caption)` - Remove ruído do Instagram
- `splitIntoEventBlocks(text)` - Divide caption em blocos de eventos

**Exemplo de caption processado:**
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

**Resultado:**
```javascript
[
  {
    title: "Disconnected",
    venue: "Só Shape - Rio Vermelho",
    time: "21:00",
    price: "Grátis",
    date: "30/01/2026"
  },
  {
    title: "Festa Proibida",
    venue: "Discodelia Pub",
    time: "19:00",
    price: "Grátis",
    date: "30/01/2026"
  }
]
```

---

### ✅ ImageProcessor
**Arquivo:** `image-processor.ts`

**Função:** Wrapper para Gemini Vision API que processa imagens de posts/stories.

**Características:**
- Processa múltiplas imagens sequencialmente
- Mantém contexto de data entre imagens
- Valida formato e tamanho das imagens
- Integra com `utils/gemini-vision.ts` existente

**Métodos:**
- `extractEvents(images, previousDate)` - Processa múltiplas imagens
- `extractFromSingleImage(imageBuffer, previousDate)` - Processa uma imagem
- `validateImage(imageBuffer)` - Valida se imagem é processável

**Validações:**
- Tamanho mínimo: 10KB
- Tamanho máximo: 10MB
- Formatos: JPEG, PNG, GIF

---

### ✅ EventAggregator
**Arquivo:** `event-aggregator.ts`

**Função:** Deduplica, ordena e agrupa eventos extraídos.

**Métodos principais:**

#### `deduplicate(events)`
Remove duplicatas baseado em:
- Título normalizado (sem acentos, pontuação)
- Data (DD/MM/YYYY)
- Local normalizado

**Merge inteligente:**
- Mantém título mais longo
- Prefere preço específico sobre "Consulte"
- Combina descrições diferentes

#### `sort(events)`
Ordena eventos por data e horário (cronológico)

#### `filterFuture(events)`
Remove eventos passados

#### `groupByDate(events)`
Agrupa eventos por data

#### `getStats(events)`
Retorna estatísticas:
- Total de eventos
- Eventos por data
- Eventos gratuitos vs pagos

---

## 🧪 Testes

### Executar testes:
```bash
npm run build
node dist/scrapers/instagram-apify/test-processors.js
```

### O que é testado:
1. **ContentDetector**
   - Detecção de tipo de conteúdo
   - Cálculo de quality score

2. **TextProcessor**
   - Extração de eventos de caption
   - Detecção de contexto de data
   - Limpeza de texto

3. **EventAggregator**
   - Deduplicação
   - Ordenação
   - Estatísticas
   - Agrupamento por data

### Exemplo de saída:
```
🧪 Testing ContentDetector
==================================================

📝 Text Post:
  Type: text_only
  Has Caption: true
  Has Images: false
  Image Count: 0
  Quality Score: 60

🧪 Testing TextProcessor
==================================================

✅ Extracted 3 events:

1. Disconnected
   📅 30/01/2026 às 21:00
   📍 Só Shape - Rio Vermelho
   💰 Grátis

2. Festa Proibida - Wil Da Nilo & Discodelia DJs
   📅 30/01/2026 às 19:00
   📍 Discodelia Pub - Rio Vermelho
   💰 Grátis

3. Keko Beatz e Baianos
   📅 30/01/2026 às 21:00
   📍 ECO - Rio Vermelho
   💰 Grátis
```

---

## 📊 Cobertura Atual

### ✅ Implementado (Fase 1)
- [x] ContentDetector
- [x] TextProcessor
- [x] ImageProcessor
- [x] EventAggregator
- [x] Tipos TypeScript
- [x] Testes unitários

### ⏳ Pendente (Próximas fases)
- [ ] ApifyAdapter (integração com Apify API)
- [ ] InstagramApifyScraper principal
- [ ] VideoProcessor (Fase 2)
- [ ] Integração com BaseScraper
- [ ] Configuração no scrapers.config.ts
- [ ] Testes end-to-end com dados reais

---

## 🔄 Próximos Passos

1. **Instalar dependência Apify:**
   ```bash
   npm install apify-client
   ```

2. **Criar conta Apify:**
   - https://console.apify.com
   - Obter API token

3. **Implementar ApifyAdapter:**
   - Integração com Instagram Profile Scraper
   - Download de imagens

4. **Implementar InstagramApifyScraper:**
   - Orquestrar todos os processadores
   - Integrar com BaseScraper

5. **Testar com dados reais:**
   - Posts do @agendaalternativasalvador
   - Validar extração de eventos

---

## 📚 Arquitetura

```
InstagramApifyScraper (pendente)
├── ApifyAdapter (pendente)
│   └── Busca posts do Instagram
├── ContentDetector ✅
│   └── Detecta tipo de conteúdo
├── Router (pendente)
│   ├─→ TextProcessor ✅
│   ├─→ ImageProcessor ✅
│   └─→ VideoProcessor (Fase 2)
└── EventAggregator ✅
    └── Deduplica e organiza eventos
```

---

## 🎯 Métricas Esperadas

### Por Formato
| Formato | Processamento | Taxa Sucesso | Eventos/Post |
|---------|--------------|--------------|--------------|
| Texto   | ~1s          | 95%          | 5-15         |
| Imagem  | ~5s          | 85%          | 3-8          |
| Vídeo   | ~15s         | 70%          | 2-5          |

### Total
- **20-30 posts/dia**
- **100-200 eventos/dia**
- **Taxa de sucesso global: 85%**
- **Tempo total: 5-10 minutos**

---

## 🐛 Troubleshooting

### Eventos não extraídos do caption
- Verificar se caption tem padrões estruturados
- Adicionar mais padrões em `TextProcessor.isEventStart()`
- Verificar logs de debug

### Duplicatas não removidas
- Verificar normalização em `EventAggregator.normalize()`
- Ajustar lógica de merge se necessário

### Imagens não processadas
- Verificar se Gemini API key está configurada
- Verificar formato e tamanho das imagens
- Checar logs de erro do Gemini

---

## 📝 Notas de Desenvolvimento

### Decisões de Design

1. **Processamento sequencial de imagens:**
   - Mantém contexto de data entre imagens
   - Importante para stories em sequência

2. **Normalização agressiva para deduplicação:**
   - Remove acentos e pontuação
   - Evita duplicatas por pequenas diferenças

3. **Merge inteligente:**
   - Preserva informação mais completa
   - Combina descrições diferentes

4. **Quality score:**
   - Prioriza posts recentes e com engajamento
   - Útil para ordenar processamento

### Padrões Observados

**Posts do @agendaalternativasalvador:**
- Usa emojis consistentemente (📍⏰💰)
- Agrupa eventos por dia da semana
- Formato: Título + Local + Horário + Preço
- Múltiplos eventos por post

**Melhorias Futuras:**
- Detectar mais padrões de caption
- Suporte a mais formatos de data
- Extração de categoria do título
- Detecção de eventos recorrentes
