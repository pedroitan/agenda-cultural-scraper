# Instagram Scraper - Configuração

## Como funciona

O scraper do Instagram tem **3 estratégias** para buscar posts:

1. **RSSHub** (primária) - Mais rápido, sem risco de bloqueio
2. **Playwright com cookies salvos** (fallback 1) - Reutiliza sessão de login anterior
3. **Playwright com login automático** (fallback 2) - Tenta login (pode ser bloqueado pelo Instagram)

⚠️ **Importante**: O Instagram detecta e bloqueia login automatizado. Por isso, usamos **cookies persistentes** - você faz login manual uma vez e o scraper reutiliza a sessão.

## Configuração de Login (Opcional mas Recomendado)

Para evitar bloqueios do Instagram, você pode configurar uma conta para login automático.

### Localmente (.env)

Crie um arquivo `.env` na raiz do projeto:

```bash
SUPABASE_URL=https://ssxowzurrtyzmracmusn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Instagram (opcional)
INSTAGRAM_USERNAME=seu_usuario_instagram
INSTAGRAM_PASSWORD=sua_senha_instagram
```

### GitHub Actions (Secrets)

1. Vá em: **Settings** → **Secrets and variables** → **Actions**
2. Adicione os seguintes secrets:

| Secret Name | Valor |
|-------------|-------|
| `INSTAGRAM_USERNAME` | Usuário do Instagram |
| `INSTAGRAM_PASSWORD` | Senha do Instagram |

**⚠️ Importante:**
- Use uma conta secundária (não sua conta pessoal principal)
- Instagram pode detectar automação e bloquear a conta
- Considere criar uma conta específica para o scraper

## Como testar

### Primeira vez - Login Manual (Recomendado):

1. Configure o `.env`:
```bash
INSTAGRAM_DEBUG=true
INSTAGRAM_USERNAME=seu_usuario
INSTAGRAM_PASSWORD=sua_senha
```

2. Rode o scraper:
```bash
npm run build
node dist/instagram-monitor-entry.js
```

3. O navegador vai abrir visualmente
4. **Faça login manualmente** no Instagram quando solicitado
5. Após login bem-sucedido, os cookies serão salvos em `instagram-cookies.json`
6. Nas próximas execuções, o scraper reutilizará esses cookies automaticamente

### Execuções seguintes:

```bash
# Não precisa mais de INSTAGRAM_DEBUG=true
npm run build
node dist/instagram-monitor-entry.js
```

O scraper vai carregar os cookies salvos e não precisará fazer login novamente!

## Logs esperados

### Sucesso com RSSHub:
```
✅ Fetched 10 posts from RSS feed
✅ New post detected! Parsing events...
📅 Extracted 6 events
```

### Sucesso com Playwright (sem login):
```
⚠️  RSS feed failed, trying Playwright fallback...
✅ Found first post: https://instagram.com/p/...
✅ Extracted caption (1234 chars)
```

### Sucesso com Playwright (com login):
```
⚠️  RSS feed failed, trying Playwright fallback...
Logging in as seu_usuario...
✅ Logged in successfully
✅ Found first post: https://instagram.com/p/...
✅ Extracted caption (1234 chars)
```

### Falha (ambos bloqueados):
```
❌ Both RSS and Playwright failed. No posts found.
```

## Frequência de execução

O monitor roda **a cada 1 hora** via GitHub Actions.

Para testar manualmente:
- GitHub → **Actions** → **Instagram Monitor** → **Run workflow**
