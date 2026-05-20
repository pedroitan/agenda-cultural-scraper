import { chromium } from 'playwright'

async function testElCabongDetails() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // First, fetch event URLs from the listing page (same logic as scraper)
  console.log('=== Buscando URLs de eventos na listagem ===')
  await page.goto('https://elcabong.com.br/agenda/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  
  // Wait for event elements
  await page.waitForSelector('.wpem-event-box-col', { timeout: 15000 })
  console.log('  Event elements found')

  // Click "Load more" button a few times
  for (let i = 0; i < 5; i++) {
    try {
      const button = page.locator('#load_more_events')
      if (await button.count() > 0 && await button.isVisible().catch(() => false)) {
        await button.click({ timeout: 5000 })
        await page.waitForTimeout(1000)
        console.log(`  Click ${i + 1}: ${await page.locator('.wpem-event-box-col').count()} events`)
      } else {
        break
      }
    } catch {
      break
    }
  }

  // Extract URLs from event cards (10 events for validation)
  const eventLinks = await page.$$eval('.wpem-event-box-col', cards => 
    cards.slice(0, 10).map(card => {
      const link = card.querySelector('a') as HTMLAnchorElement
      const titleEl = card.querySelector('.wpem-event-title') || card.querySelector('h3')
      return {
        url: link?.href || '',
        title: titleEl?.textContent?.trim() || link?.textContent?.trim() || ''
      }
    }).filter(ev => ev.url)
  )

  console.log(`✓ Encontrados ${eventLinks.length} URLs para teste`)
  eventLinks.forEach((ev, i) => {
    console.log(`  ${i + 1}. ${ev.title.slice(0, 50)} - ${ev.url}`)
  })

  // Test each event detail page
  for (let i = 0; i < eventLinks.length; i++) {
    const { url, title } = eventLinks[i]
    console.log(`\n=== Test ${i + 1}/${eventLinks.length} ===`)
    console.log(`Título: ${title}`)
    console.log(`URL: ${url}`)

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      const html = await page.content()

      // Save HTML to file for inspection
      const fs = await import('fs')
      fs.writeFileSync(`elcabong-detail-${i + 1}.html`, html)

      console.log(`✓ HTML salvo em elcabong-detail-${i + 1}.html`)

      // Look for structured data (JSON-LD, schema.org)
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)
      if (jsonLdMatch) {
        console.log(`✓ Encontrado ${jsonLdMatch.length} bloco(s) JSON-LD`)
        jsonLdMatch.forEach((block, idx) => {
          try {
            const json = JSON.parse(block.replace(/<script[^>]*>|<\/script>/g, ''))
            console.log(`  Bloco ${idx + 1}:`, JSON.stringify(json, null, 2).slice(0, 500))
          } catch (e) {
            console.log(`  Bloco ${idx + 1}: (erro ao parsear)`)
          }
        })
      } else {
        console.log(`✗ Nenhum JSON-LD encontrado`)
      }

      // Look for meta tags (OpenGraph, Twitter)
      const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/i)
      const ogDesc = html.match(/<meta property="og:description" content="([^"]*)"/i)
      if (ogTitle || ogDesc) {
        console.log(`✓ Meta tags encontradas:`)
        if (ogTitle) console.log(`  og:title: ${ogTitle[1]}`)
        if (ogDesc) console.log(`  og:description: ${ogDesc[1].slice(0, 200)}`)
      }

      // Look for common description patterns
      const descPatterns = [
        /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*class="[^"]*about[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<p[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      ]
      
      let foundDesc = false
      descPatterns.forEach((pattern, idx) => {
        const matches = html.match(pattern)
        if (matches) {
          console.log(`✓ Padrão ${idx + 1}: ${matches.length} match(es)`)
          matches.slice(0, 2).forEach((m, mIdx) => {
            console.log(`  Match ${mIdx + 1}: ${m.slice(0, 200)}`)
          })
          foundDesc = true
        }
      })
      
      if (!foundDesc) {
        console.log(`✗ Nenhum padrão de descrição encontrado`)
      }

    } catch (err) {
      console.error(`✗ Erro: ${err}`)
    }

    await page.waitForTimeout(1000)
  }

  await browser.close()
  console.log('\n=== Teste concluído ===')
}

testElCabongDetails()
