# 🔧 Setup do Apify para Instagram Scraper

## 📋 Passo a Passo

### 1. Criar Conta no Apify

1. Acesse: https://console.apify.com/sign-up
2. Crie conta gratuita (email ou GitHub)
3. Confirme email

**Plano Gratuito:**
- 500 platform credits/mês
- Suficiente para ~100-200 posts/dia
- Renovação automática todo mês

---

### 2. Obter API Token

1. Faça login em: https://console.apify.com
2. Clique no seu perfil (canto superior direito)
3. Vá em **Settings** > **Integrations**
4. Na seção **Personal API tokens**, clique em **+ Create new token**
5. Nome do token: `agenda-cultural-scraper`
6. Copie o token (formato: `apify_api_xxxxxxxxxxxxx`)

⚠️ **IMPORTANTE:** Guarde o token em local seguro! Ele não será mostrado novamente.

---

### 3. Configurar Variáveis de Ambiente

#### Local (.env)

Adicione ao arquivo `.env` na raiz do projeto:

```bash
APIFY_TOKEN=apify_api_xxxxxxxxxxxxx
```

#### GitHub Actions

1. Acesse: https://github.com/seu-usuario/agenda-cultural-scraper/settings/secrets/actions
2. Clique em **New repository secret**
3. Nome: `APIFY_TOKEN`
4. Valor: `apify_api_xxxxxxxxxxxxx`
5. Clique em **Add secret**

---

### 4. Testar Conexão

Execute o script de teste:

```bash
npm run build
node dist/scrapers/instagram-apify/test-apify-connection.js
```

**Saída esperada:**
```
✅ Connected to Apify as: seu-username
💰 Available Apify credits: 500
```

---

## 🎯 Instagram Profile Scraper

O scraper usa o actor oficial do Apify: **apify/instagram-profile-scraper**

### Características:

- ✅ Busca posts de perfis públicos
- ✅ Extrai caption, imagens, vídeos
- ✅ Retorna likes, comentários, timestamp
- ✅ Suporta carrossel de imagens
- ❌ Não busca stories (requer login)

### Custo:

- ~5-10 credits por execução (20 posts)
- ~50-100 execuções/mês no plano gratuito

### Documentação:

https://apify.com/apify/instagram-profile-scraper

---

## 📊 Monitoramento de Créditos

### Via Dashboard:

1. Acesse: https://console.apify.com
2. Vá em **Usage** no menu lateral
3. Veja consumo de credits

### Via API:

```javascript
const adapter = new ApifyAdapter(process.env.APIFY_TOKEN)
const credits = await adapter.checkCredits()
console.log(`Credits: ${credits}`)
```

---

## ⚠️ Limites e Restrições

### Instagram:

- ⚠️ Perfis privados: não funcionam
- ⚠️ Rate limiting: Apify gerencia automaticamente
- ⚠️ Stories: requerem login (não disponível no plano gratuito)

### Apify:

- ✅ 500 credits/mês (gratuito)
- ✅ Renovação automática
- ⚠️ Execuções simultâneas: limitadas no plano gratuito

---

## 🔄 Alternativas ao Apify

Se os créditos acabarem ou precisar de mais posts:

### 1. Apify Pago
- $49/mês: 5000 credits
- $99/mês: 12000 credits

### 2. Outros Scrapers
- Bright Data
- ScraperAPI
- Octoparse

### 3. API Oficial do Instagram
- Requer aprovação do Facebook
- Limitações de rate
- Mais complexo

---

## 🐛 Troubleshooting

### "Invalid API token"
- Verifique se o token está correto
- Confirme que não tem espaços extras
- Gere novo token se necessário

### "Insufficient credits"
- Verifique saldo em: https://console.apify.com/usage
- Aguarde renovação mensal
- Considere upgrade de plano

### "Actor not found"
- Verifique se `apify/instagram-profile-scraper` está disponível
- Tente outro actor de Instagram

### "No posts returned"
- Verifique se o perfil é público
- Confirme que o username está correto
- Tente com outro perfil de teste

---

## ✅ Checklist de Setup

- [ ] Conta Apify criada
- [ ] API token gerado
- [ ] Token adicionado ao `.env`
- [ ] Token adicionado ao GitHub Secrets
- [ ] Teste de conexão executado com sucesso
- [ ] Créditos verificados (>= 500)
- [ ] Primeiro scrape testado

---

## 📚 Recursos

- **Apify Console:** https://console.apify.com
- **Documentação:** https://docs.apify.com
- **Instagram Scraper:** https://apify.com/apify/instagram-profile-scraper
- **Pricing:** https://apify.com/pricing
- **Support:** https://apify.com/support
