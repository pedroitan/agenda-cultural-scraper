// Test: verifica quantos eventos tem venue_name e image_url após as correções
const headers = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'pt-BR,pt;q=0.9',
  'referer': 'https://www.sympla.com.br/',
}

const url = 'https://www.sympla.com.br/eventos/salvador-ba/show-musica-festa'
const res = await fetch(url, { headers })
const html = await res.text()

const cardPattern = /<a[^>]*href="([^"]*\/evento\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
let match, total = 0, withVenue = 0, withImage = 0

while ((match = cardPattern.exec(html)) !== null) {
  const [, , cardContent] = match
  const title = cardContent.match(/<h3[^>]*>([^<]+)<\/h3>/i)?.[1]
  if (!title || title.includes('Sympla')) continue
  total++
  
  const venue = cardContent.match(/<p[^>]*class="[^"]*pn67h1h[^"]*"[^>]*>([^<]+)<\/p>/i)?.[1] ||
                cardContent.match(/<p[^>]*>([^<]+-[^<]*, BA[^<]*)<\/p>/i)?.[1]
  const image = cardContent.match(/src="(https:\/\/images\.sympla\.com\.br\/[^"]+)"/i)?.[1]
  
  if (venue) withVenue++
  if (image) withImage++
  
  if (total <= 5) {
    console.log(`\n[${total}] ${title?.trim().substring(0, 50)}`)
    console.log(`  Venue: ${venue?.trim() || '❌ não encontrado'}`)
    console.log(`  Image: ${image ? '✅ ' + image.substring(0, 60) : '❌ não encontrado'}`)
  }
}

console.log(`\n=== RESUMO (página 1 de show-musica-festa) ===`)
console.log(`Total eventos: ${total}`)
console.log(`Com venue_name: ${withVenue}/${total} (${Math.round(withVenue/total*100)}%)`)
console.log(`Com image_url:  ${withImage}/${total} (${Math.round(withImage/total*100)}%)`)
