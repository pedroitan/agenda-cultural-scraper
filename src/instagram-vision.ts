import { chromium } from 'playwright'
import type { EventInput, ScraperInput } from './types.js'
import { extractEventsFromImage } from './utils/gemini-vision.js'

type InstagramVisionScrapeResult = {
  valid: EventInput[]
  invalid_count: number
  items_fetched: number
}

// Parse date from DD/MM/YYYY to ISO string
function parseInstagramDate(dateStr: string, timeStr: string): string | null {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null

  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = match[3]

  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/)
  const hour = timeMatch ? timeMatch[1].padStart(2, '0') : '19'
  const minute = timeMatch ? timeMatch[2] : '00'

  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

// Determine category from title/description
function categorizeEvent(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase()

  if (text.match(/show|música|festival|concert|samba|pagode|rock|jazz|mpb/)) {
    return 'Shows e Festas'
  }
  if (text.match(/teatro|peça|espetáculo|drama|comédia/)) {
    return 'Teatro'
  }
  if (text.match(/arte|exposição|galeria|museu|cultura/)) {
    return 'Arte e Cultura'
  }
  if (text.match(/gastronomia|culinária|restaurante|food|comida/)) {
    return 'Gastronomia'
  }
  if (text.match(/curso|workshop|aula|treinamento/)) {
    return 'Cursos'
  }
  if (text.match(/palestra|conferência|seminário|talk/)) {
    return 'Palestras'
  }

  return 'Shows e Festas' // Default
}

export async function runInstagramVisionScrape(
  input: ScraperInput,
  instagramHandle: string = 'agendaalternativasalvador'
): Promise<InstagramVisionScrapeResult> {
  const valid: EventInput[] = []
  let invalid_count = 0
  let items_fetched = 0
  const seenIds = new Set<string>()

  console.log(`Scraping Instagram @${instagramHandle} with Gemini Vision...`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  })

  try {
    // Navigate to Instagram profile
    await page.goto(`https://www.instagram.com/${instagramHandle}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })

    await page.waitForTimeout(3000)

    // Get recent posts (first 12 posts visible without scrolling)
    const posts = await page.$$('article a[href*="/p/"]')
    console.log(`  Found ${posts.length} posts`)

    // Limit to first 9 posts to stay within free tier
    const postsToProcess = posts.slice(0, 9)

    for (let i = 0; i < postsToProcess.length; i++) {
      try {
        const post = postsToProcess[i]
        console.log(`\n  📸 Processing post ${i + 1}/${postsToProcess.length}...`)

        // Click to open post
        await post.click()
        await page.waitForTimeout(2000)

        // Find image in the modal
        const imageElement = await page.$('article img[src*="scontent"]')
        if (!imageElement) {
          console.log('  ⚠️  No image found in post')
          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)
          continue
        }

        // Get image URL
        const imageUrl = await imageElement.getAttribute('src')
        if (!imageUrl) {
          console.log('  ⚠️  No image URL found')
          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)
          continue
        }

        console.log(`  📥 Downloading image...`)

        // Download image using Playwright
        const response = await page.request.get(imageUrl)
        if (!response.ok()) {
          console.log(`  ⚠️  Failed to download image (${response.status()})`)
          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)
          continue
        }

        const imageBuffer = await response.body()
        const contentType = response.headers()['content-type'] || 'image/jpeg'

        console.log(`  🤖 Analyzing image with Gemini Vision...`)

        // Extract events from image using Gemini Vision
        const extractedEvents = await extractEventsFromImage(imageBuffer, contentType)

        if (extractedEvents.length === 0) {
          console.log('  ℹ️  No events found in this image')
          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)
          continue
        }

        // Process each extracted event
        for (const ev of extractedEvents) {
          const startDatetime = parseInstagramDate(ev.date, ev.time)
          if (!startDatetime) {
            console.log(`  ⚠️  Invalid date format: ${ev.date} ${ev.time}`)
            invalid_count++
            continue
          }

          const externalId = `instagram-vision-${Buffer.from(ev.title + ev.date).toString('base64').slice(0, 20)}`

          if (seenIds.has(externalId)) continue
          seenIds.add(externalId)

          const category = categorizeEvent(ev.title, ev.description)
          const isFree = ev.price.toLowerCase().includes('grátis') || ev.price.toLowerCase().includes('gratuito')

          valid.push({
            source: 'instagram',
            external_id: externalId,
            title: ev.title,
            start_datetime: startDatetime,
            city: input.city,
            venue_name: ev.venue || undefined,
            price_text: ev.price !== 'Consulte' ? ev.price : undefined,
            category,
            is_free: isFree,
            url: `https://www.instagram.com/${instagramHandle}/`,
            raw_payload: ev,
          })

          items_fetched++
          console.log(`  ✅ Event: ${ev.title}`)
        }

        // Close modal
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)

      } catch (err) {
        console.log(`  ⚠️  Error processing post: ${err instanceof Error ? err.message : 'Unknown error'}`)
        invalid_count++
        
        // Try to close modal if open
        try {
          await page.keyboard.press('Escape')
          await page.waitForTimeout(1000)
        } catch {}
      }
    }

  } catch (err) {
    console.error('Error scraping Instagram:', err)
    invalid_count++
  } finally {
    await browser.close()
  }

  console.log(`\nInstagram Vision scrape complete: ${valid.length} valid, ${invalid_count} invalid`)

  return { valid, invalid_count, items_fetched }
}
