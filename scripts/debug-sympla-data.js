// Debug: dump __NEXT_DATA__ and response cookies from a Sympla listing page
const headers = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'referer': 'https://www.sympla.com.br/',
}

const url = 'https://www.sympla.com.br/eventos/salvador-ba/show-musica-festa'
console.log(`Fetching: ${url}\n`)

const res = await fetch(url, { headers })

// 1. Print cookies from response
console.log('=== COOKIES DA RESPOSTA ===')
const cookies = res.headers.get('set-cookie')
console.log(cookies || '(nenhum cookie)')

// 2. Extract __NEXT_DATA__
const html = await res.text()
const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
if (!match) {
  console.log('\n❌ __NEXT_DATA__ não encontrado')
  process.exit(1)
}

const nextData = JSON.parse(match[1])

// 3. Find first event object with venue data
function findFirstEvent(obj, depth = 0) {
  if (depth > 6 || !obj || typeof obj !== 'object') return null
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findFirstEvent(item, depth + 1)
      if (found) return found
    }
  } else {
    if ((obj.name || obj.title) && (obj.url || obj.id) && (obj.start_date || obj.startDate || obj.date)) {
      return obj
    }
    for (const val of Object.values(obj)) {
      const found = findFirstEvent(val, depth + 1)
      if (found) return found
    }
  }
  return null
}

const firstEvent = findFirstEvent(nextData)

console.log('\n=== PRIMEIRO EVENTO NO __NEXT_DATA__ ===')
if (firstEvent) {
  console.log(JSON.stringify(firstEvent, null, 2))
} else {
  console.log('Nenhum evento encontrado. Top-level keys:')
  console.log(Object.keys(nextData))
  console.log('\nPageProps keys:')
  console.log(Object.keys(nextData?.props?.pageProps || {}))
}

// 4. Print Next.js build ID (needed for _next/data endpoints)
console.log('\n=== BUILD ID (para _next/data) ===')
console.log(nextData?.buildId || '(não encontrado)')
