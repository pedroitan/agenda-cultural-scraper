// Debug: ver estrutura HTML real de um card de evento do Sympla
const headers = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'referer': 'https://www.sympla.com.br/',
}

const url = 'https://www.sympla.com.br/eventos/salvador-ba/show-musica-festa'
const res = await fetch(url, { headers })

// Captura cookies
const cfCookie = res.headers.get('set-cookie')
console.log('Cookie Cloudflare:', cfCookie?.substring(0, 80) + '...\n')

const html = await res.text()

// 1. Verificar se tem __NEXT_DATA__
const hasNextData = html.includes('__NEXT_DATA__')
console.log('Tem __NEXT_DATA__:', hasNextData)

// 2. Encontrar primeiro link de evento
const eventLinkMatch = html.match(/href="(https:\/\/www\.sympla\.com\.br\/evento\/[^"]+)"/)
console.log('Primeiro link evento:', eventLinkMatch?.[1] || 'não encontrado')

// 3. Extrair um trecho do HTML em volta de um evento para ver a estrutura
const firstEventIdx = html.indexOf('/evento/')
if (firstEventIdx > 0) {
  const start = Math.max(0, firstEventIdx - 500)
  const end = Math.min(html.length, firstEventIdx + 1000)
  console.log('\n=== TRECHO HTML EM VOLTA DO EVENTO ===')
  console.log(html.substring(start, end))
}

// 4. Verificar se venue aparece no HTML das cards
const venuePatterns = [
  /class="[^"]*pn67h1[^"]*"[^>]*>([^<]+Salvador[^<]+)</g,
  /class="[^"]*venue[^"]*"[^>]*>([^<]+)</g,
  /class="[^"]*local[^"]*"[^>]*>([^<]+)</g,
  /<p[^>]*>([^<]+Salvador[^<]+)<\/p>/g,
]

console.log('\n=== VENUE NOS CARDS ===')
for (const pattern of venuePatterns) {
  const matches = [...html.matchAll(pattern)]
  if (matches.length > 0) {
    console.log(`Pattern ${pattern}: ${matches.length} matches`)
    console.log('Primeiro:', matches[0][1]?.trim())
  }
}

// 5. Testar se a página de detalhe funciona com o cookie do Cloudflare
const cfCookieValue = cfCookie?.match(/__cf_bm=([^;]+)/)?.[0]
if (cfCookieValue && eventLinkMatch?.[1]) {
  console.log('\n=== TESTANDO DETALHE COM COOKIE CLOUDFLARE ===')
  const detailUrl = eventLinkMatch[1]
  console.log('URL:', detailUrl)
  try {
    const detailRes = await fetch(detailUrl, {
      headers: { ...headers, 'cookie': cfCookieValue },
      signal: AbortSignal.timeout(8000)
    })
    console.log('Status:', detailRes.status)
    const detailHtml = await detailRes.text()
    const hasData = detailHtml.includes('__NEXT_DATA__')
    console.log('Tem __NEXT_DATA__:', hasData)
    if (hasData) {
      const match = detailHtml.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/)
      const data = JSON.parse(match[1])
      const props = data?.props?.pageProps
      console.log('PageProps keys:', Object.keys(props || {}))
      if (props?.event) {
        console.log('Venue:', props.event.venue?.name || props.event.place?.name || 'não encontrado')
        console.log('Image:', props.event.image || props.event.banner || 'não encontrado')
      }
    }
  } catch (e) {
    console.log('Erro:', e.message)
  }
}
