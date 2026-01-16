# Instagram Scraper - Configuração

## Como funciona

O scraper do Instagram tem **3 estratégias** para buscar posts:

1. **RSSHub** (primária) - Mais rápido, sem risco de bloqueio
2. **Playwright sem login** (fallback 1) - Tenta acessar perfil público
3. **Playwright com login** (fallback 2) - Usa conta do Instagram para acesso garantido

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

### Sem login (pode ser bloqueado):
```bash
npm run build
node dist/instagram-monitor-entry.js
```

### Com login:
```bash
# Configure .env primeiro
npm run build
node dist/instagram-monitor-entry.js
```

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
