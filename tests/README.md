# Tests

Scripts de teste para validar os scrapers e processadores.

## Pré-requisito

```bash
npm run build
```

## Instagram Apify Scraper

| Script | Descrição |
|--------|-----------|
| `test-specific-post.js` | Testa extração de um post específico por URL |
| `test-saturday-post.js` | Valida post de sábado (35 eventos) |
| `test-sunday-post.js` | Valida post de quinta/domingo |
| `test-date-extraction.js` | Valida extração de data do caption |
| `test-raw-caption.js` | Inspeciona caption bruto de um post |
| `test-post-dates.js` | Verifica datas de múltiplos posts |
| `test-regex-date.js` | Testa regex de extração de data |
| `test-instagram-processors.js` | Testa ContentDetector + TextProcessor |
| `test-instagram.js` | Teste geral do scraper Instagram |
| `test-previous-day.js` | Testa post do dia anterior |
| `test-real-caption.js` | Testa caption real longo |

## Gemini Vision

| Script | Descrição |
|--------|-----------|
| `test-gemini-vision.js` | Testa extração de eventos de imagens |
| `test-gemini-vision-v2.js` | Versão 2 do teste Vision |
| `test-api-key.js` | Valida configuração da API key |

## El Cabong

| Script | Descrição |
|--------|-----------|
| `test-elcabong-debug.js` | Debug do scraper El Cabong |
| `test-elcabong-dates.js` | Valida extração de datas |
| `test-elcabong-db.js` | Testa persistência no banco |
| `test-elcabong-fix.js` | Testa correções do scraper |

## Como Rodar

```bash
# Exemplo
node tests/test-specific-post.js
node tests/test-saturday-post.js
```
