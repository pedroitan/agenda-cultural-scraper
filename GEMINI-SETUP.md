# 🤖 Configuração do Gemini Vision API

## Obter API Key (Gratuito)

1. **Acesse:** https://aistudio.google.com/app/apikey
2. **Faça login** com sua conta Google
3. **Clique em "Create API Key"**
4. **Copie a chave** gerada

## Configurar no Projeto

### Opção 1: Arquivo .env (Recomendado)

Adicione no arquivo `.env`:

```bash
GEMINI_API_KEY=sua-chave-aqui
```

### Opção 2: Variável de Ambiente (Temporário)

```powershell
$env:GEMINI_API_KEY="sua-chave-aqui"
```

## Limites do Plano Gratuito

- **Gemini 1.5 Flash:** 1500 requisições/dia (GRÁTIS)
- **Gemini 1.5 Pro:** 50 requisições/dia (GRÁTIS)

## Como Funciona

1. **Scraper acessa Instagram** (@agendaalternativasalvador)
2. **Baixa imagens** dos últimos 9 posts
3. **Gemini Vision analisa** cada imagem
4. **Extrai eventos** automaticamente:
   - Título
   - Data e horário
   - Local
   - Preço
   - Descrição
5. **Salva no banco** de dados

## Exemplo de Uso

```bash
# Compilar
npm run build

# Executar scraper (inclui Instagram Vision)
node dist/index.js
```

## Prompt Usado

O Gemini recebe este prompt para cada imagem:

```
Analise esta imagem de post do Instagram e extraia TODOS os eventos culturais mencionados.

Para cada evento, retorne um objeto JSON com:
- title: Nome do evento
- date: Data no formato DD/MM/YYYY
- time: Horário no formato HH:MM
- venue: Local do evento
- price: Preço (Grátis, Consulte, ou R$ XX)
- description: Descrição adicional (opcional)

Retorne APENAS um array JSON válido.
```

## Estimativa de Custos

**Cenário Atual:**
- 9 posts/dia
- 1 imagem por post
- **Custo:** $0 (dentro do limite gratuito)

**Cenário Futuro (escalado):**
- 50 posts/dia
- **Custo:** $0 (ainda dentro do limite gratuito)

## Perfis do Instagram Suportados

Atualmente configurado para:
- `@agendaalternativasalvador`

Para adicionar mais perfis, edite `src/index.ts`:

```typescript
{ 
  name: 'instagram', 
  run: (input) => runInstagramVisionScrape(input, 'outro_perfil') 
}
```

## Troubleshooting

### "Gemini API not configured"
- Verifique se a variável `GEMINI_API_KEY` está definida
- Reinicie o terminal após adicionar ao `.env`

### "No events found in this image"
- A imagem não contém eventos detectáveis
- Pode ser propaganda, aviso, ou formato não reconhecido

### "Invalid date format"
- O Gemini retornou data em formato incorreto
- Evento será marcado como inválido

## Próximos Passos

1. ✅ Obter API key do Gemini
2. ✅ Configurar no `.env`
3. ✅ Executar scraper
4. ✅ Verificar eventos extraídos no banco
5. ✅ Validar no site
