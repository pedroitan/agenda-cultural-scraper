# 🖼️ Guia: Download de Imagens para Supabase Storage

## Por que fazer isso?

**Vantagens:**
- ✅ **Performance** - Imagens servidas do CDN do Supabase
- ✅ **Confiabilidade** - Não depende de sites externos
- ✅ **Controle** - Você controla as imagens
- ✅ **Sem CORS** - Elimina problemas de cross-origin
- ✅ **Otimização** - Pode redimensionar/comprimir

## Passo 1: Criar Bucket no Supabase

1. Acesse: https://supabase.com/dashboard/project/ssxowzurrtyzmracmusn/storage/buckets
2. Clique em **"New bucket"**
3. Configure:
   - **Name:** `event-images`
   - **Public:** ✅ Sim (marque a checkbox)
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp`
4. Clique em **"Create bucket"**

## Passo 2: Executar Script

```bash
cd c:\Users\pedro\OneDrive\Área de Trabalho\DEV\agenda-cultural-scraper
node scripts/download-images-to-supabase.js
```

## Passo 3: Atualizar Next.js Config

Adicione o domínio do Supabase Storage no `next.config.ts`:

```typescript
{
  protocol: "https",
  hostname: "ssxowzurrtyzmracmusn.supabase.co",
  pathname: "/storage/v1/object/public/**",
}
```

## O Que o Script Faz

1. **Busca** todos os eventos com imagens externas
2. **Baixa** cada imagem (com User-Agent para evitar bloqueio)
3. **Faz upload** para Supabase Storage (`event-images/events/`)
4. **Atualiza** a URL no banco de dados
5. **Pula** imagens já hospedadas no Supabase

## Formato das URLs

**Antes:**
```
https://elcabong.com.br/wp-content/uploads/2025/12/evento.jpg
https://images.sympla.com.br/evento.jpg
```

**Depois:**
```
https://ssxowzurrtyzmracmusn.supabase.co/storage/v1/object/public/event-images/events/event-123.jpg
```

## Integração com Scraper

Para automatizar, você pode adicionar o download de imagens diretamente no scraper:

### Opção 1: Modificar Scraper (Recomendado)

Adicione a função de download no scraper para que novas imagens sejam automaticamente hospedadas no Supabase.

### Opção 2: Script Periódico

Execute o script manualmente ou via cron job para processar imagens periodicamente.

## Considerações

### Espaço de Armazenamento
- **Plano Free:** 1 GB de storage
- **Estimativa:** ~100 KB por imagem = ~10.000 eventos
- **Limpeza:** Deletar imagens de eventos passados periodicamente

### Performance
- Script processa ~2 imagens/segundo (rate limiting)
- ~600 eventos = ~5 minutos de execução

### Custos
- **Plano Free:** Grátis até 1 GB + 2 GB de transferência
- **Plano Pro:** $25/mês = 100 GB storage + 200 GB transferência

## Troubleshooting

### Erro: "Bucket not found"
- Verifique se criou o bucket `event-images`
- Confirme que está público

### Erro: "Failed to download"
- Alguns sites bloqueiam downloads automatizados
- Imagens podem ter sido removidas do site original

### Erro: "SUPABASE_SERVICE_KEY not set"
- Configure a variável no arquivo `.env`
- Use a service role key (não a anon key)

## Próximos Passos

Após executar o script:
1. ✅ Imagens hospedadas no Supabase
2. ✅ URLs atualizadas no banco
3. ✅ Site carrega imagens do Supabase
4. ✅ Independência de sites externos
