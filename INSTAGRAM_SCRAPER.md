# Instagram Scraper

Este módulo extrai eventos do Instagram do perfil `@agendaalternativasalvador`.

## Dois Métodos de Scraping

### 1. Instagram Vision (Padrão)

**Variável de ambiente:** `USE_INSTAGRAM_APIFY=false`

**Como funciona:**
- Usa Playwright para navegar no Instagram
- Baixa imagens dos posts
- Usa Google Gemini Vision AI para extrair eventos das imagens
- NÃO extrai texto do caption

**Requisitos:**
- `GEMINI_API_KEY` (obrigatório)

**Vantagens:**
- Funciona para posts com agendas em formato de imagem
- Não depende de Apify
- Sem custo de API do Apify

**Desvantagens:**
- Mais lento (navegação manual no Instagram)
- Apenas extrai de imagens
- Dependente da qualidade das imagens

**Melhor para:**
- Stories com agendas
- Carrosséis de imagens
- Posts com agendas visuais

---

### 2. Instagram Apify

**Variável de ambiente:** `USE_INSTAGRAM_APIFY=true`

**Como funciona:**
- Usa Apify API para buscar posts do Instagram
- Extrai eventos de TRÊS fontes:
  1. **Caption/texto do post** (TextProcessor)
  2. **Imagens** (Gemini Vision)
  3. **Mensagens/comentários do autor** (MessageProcessor)

**Requisitos:**
- `APIFY_TOKEN` (obrigatório)
- `GEMINI_API_KEY` (obrigatório)

**Vantagens:**
- Mais robusto e estável
- Extrai de múltiplas fontes
- Texto do caption é mais confiável que imagens
- Cache de 24h para reduzir chamadas API

**Desvantagens:**
- Dependente de Apify (custo de créditos)
- Requer duas chaves de API

**Melhor para:**
- Posts com agendas em texto no caption
- Extração confiável de eventos
- Produção (mais estável)

---

## Configuração

### Variáveis de Ambiente

```env
# Método de scraping (obrigatório)
USE_INSTAGRAM_APIFY=false  # Vision (padrão) ou true (Apify)

# Para Instagram Vision
GEMINI_API_KEY=your_gemini_key

# Para Instagram Apify
APIFY_TOKEN=your_apify_token
GEMINI_API_KEY=your_gemini_key
```

### Arquivo .env

O `dotenv/config` carrega apenas `.env`, não `.env.local`. Para testar localmente:

```bash
# Criar arquivo .env
cat > .env << EOF
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
GEMINI_API_KEY=your_gemini_key
APIFY_TOKEN=your_apify_token
USE_INSTAGRAM_APIFY=false
EOF
```

---

## Uso

### Rodar localmente

```bash
# Instagram Vision (padrão)
npm run build
npx tsx scripts/run-instagram.ts

# Instagram Apify
USE_INSTAGRAM_APIFY=true npx tsx scripts/run-instagram.ts
```

### GitHub Actions

Os workflows já estão configurados com as variáveis necessárias:

- `.github/workflows/scrape-instagram-salvador.yml` - Scraper individual
- `.github/workflows/scrape.yml` - Scraper principal (todos)

**Segredos necessários no GitHub:**
- `GEMINI_API_KEY` (obrigatório para ambos)
- `APIFY_TOKEN` (obrigatório apenas para Apify)

---

## Como o Apify Funciona

### Busca de Posts

1. **Busca via Apify API:**
   - Busca até 20 posts do perfil
   - Usa cache de 24h (`.cache/instagram-apify/`)

2. **Filtro local:**
   - Filtra posts dos últimos 7 dias
   - Ordena por data (mais recentes primeiro)

3. **Extração de eventos:**
   - **Caption:** TextProcessor extrai eventos do texto
   - **Imagens:** Gemini Vision extrai eventos das imagens
   - **Mensagens:** Complementa com comentários do autor

### Exemplo de Saída

```
📱 Fetching Instagram posts for @agendaalternativasalvador...
   💾 Loaded 20 posts from cache (age: 15min)
   Filtered to 5 posts from last 7 days (sorted by date)

📝 Processing post 3902226545679025900
   Type: post
   Caption preview: ♫ Agenda de #Sexta, 22 de Maio ♫
  📝 Found 36 potential event block(s) in caption
  📅 Event date: 2026-05-22

✅ Scrape completed
   Posts processed: 5
   Events extracted: 36
   Caption events: 123
   Image events: 0
```

---

## Troubleshooting

### Erro: "GEMINI_API_KEY is required"

**Causa:** Chave do Gemini não configurada

**Solução:**
- Adicione `GEMINI_API_KEY` ao `.env` ou secrets do GitHub
- Verifique se a chave é válida

### Erro: "APIFY_TOKEN is required for Instagram Apify scraper"

**Causa:** Tentando usar Apify sem token

**Solução:**
- Adicione `APIFY_TOKEN` ao `.env` ou secrets do GitHub
- Ou mude para `USE_INSTAGRAM_APIFY=false` (Vision)

### Scraper retorna 0 eventos

**Causas possíveis:**
1. Posts recentes não têm agendas
2. GEMINI_API_KEY não configurada
3. Formato dos posts mudou

**Solução:**
- Verifique os logs para ver se posts foram processados
- Teste com Apify (mais robusto para texto)
- Verifique se o perfil tem posts recentes

---

## Recomendação

**Para produção:** Use **Instagram Apify** (`USE_INSTAGRAM_APIFY=true`)
- Mais estável e confiável
- Extrai de múltiplas fontes
- Cache reduz custos

**Para desenvolvimento/teste:** Use **Instagram Vision** (`USE_INSTAGRAM_APIFY=false`)
- Sem custo de Apify
- Mais simples de configurar
- Bom para testar com imagens
