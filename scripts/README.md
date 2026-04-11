# Instagram Cache Scripts

Sistema de cache local para economizar créditos do Apify.

## 🎯 Objetivo

Em vez de chamar o Apify toda vez que precisar processar eventos:
- **Antes:** Apify toda vez = muitos créditos gastos
- **Agora:** Apify 1x/dia → processa N vezes = economia de 90%+

## 📋 Workflow

### 1. Buscar Posts (1x por dia)
```bash
node scripts/fetch-instagram-posts.js
```

**O que faz:**
- Chama Apify para buscar últimos 20 posts
- Busca comentários do autor (continuação dos posts)
- Salva tudo em `cache/instagram-posts.json`
- **Custo:** ~5-10 créditos Apify

**Quando rodar:**
- 1x por dia (manhã)
- Quando quiser atualizar os posts

---

### 2. Processar Posts (N vezes, sem custo)
```bash
node scripts/process-cached-posts.js
```

**O que faz:**
- Lê posts do cache local
- Extrai eventos usando TextProcessor
- Deduplica e agrega eventos
- Salva em `cache/extracted-events.json`
- **Custo:** 0 créditos Apify ✅

**Quando rodar:**
- Quantas vezes quiser!
- Ao melhorar o TextProcessor
- Para testar diferentes configurações

---

### 3. Ver Cache (opcional)
```bash
node scripts/view-cache.js
```

**O que faz:**
- Mostra informações do cache
- Preview dos posts salvos
- Estatísticas dos eventos extraídos

---

## 📁 Estrutura do Cache

```
cache/
├── .gitignore              # Ignora arquivos JSON no git
├── instagram-posts.json    # Posts brutos do Apify
└── extracted-events.json   # Eventos processados
```

### instagram-posts.json
```json
{
  "fetchedAt": "2026-03-29T04:00:00.000Z",
  "username": "agendaalternativasalvador",
  "postsCount": 20,
  "posts": [
    {
      "id": "3861636773785532964",
      "url": "https://www.instagram.com/p/DWXSi-ZEnok/",
      "caption": "♫ Agenda de #Sexta, 27 de Março ♫\n\n...",
      "images": ["https://..."],
      "timestamp": "2026-03-26T22:10:00.000Z",
      "likes": 150
    }
  ]
}
```

### extracted-events.json
```json
{
  "processedAt": "2026-03-29T04:05:00.000Z",
  "totalEvents": 84,
  "stats": {
    "total": 84,
    "free": 12,
    "paid": 35
  },
  "eventsByDate": [
    {
      "date": "2026-03-27",
      "count": 37,
      "events": [...]
    }
  ]
}
```

---

## 💰 Economia de Créditos

**Cenário sem cache:**
- Desenvolver TextProcessor: 50 testes × 10 créditos = **500 créditos**
- Ajustar regex: 20 testes × 10 créditos = **200 créditos**
- **Total: 700 créditos** 💸

**Cenário com cache:**
- Buscar posts 1x: **10 créditos**
- Processar 70 vezes: **0 créditos**
- **Total: 10 créditos** ✅

**Economia: 98.6%!**

---

## 🔄 Próximos Passos

1. ✅ Cache local funcionando
2. ⏳ Migrar para Supabase (tabela `instagram_posts_cache`)
3. ⏳ Cron job diário para atualizar cache
4. ⏳ Integrar com scraper principal

---

## 🛠️ Desenvolvimento

**Melhorar o TextProcessor:**
```bash
# 1. Buscar posts (1x)
node scripts/fetch-instagram-posts.js

# 2. Editar src/scrapers/instagram-apify/text-processor.ts
# 3. Recompilar
npm run build

# 4. Testar (sem gastar Apify!)
node scripts/process-cached-posts.js

# 5. Repetir passos 2-4 até ficar perfeito
```

**Atualizar posts:**
```bash
# Buscar novos posts
node scripts/fetch-instagram-posts.js

# Processar
node scripts/process-cached-posts.js
```
