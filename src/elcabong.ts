import { chromium } from 'playwright'
import type { EventInput, ScraperInput } from './types.js'

type ElCabongScrapeResult = {
  valid: EventInput[]
  invalid_count: number
  items_fetched: number
}

// Parse date like "11/12/2025 - 21:00" to ISO string
function parseElCabongDate(dateStr: string): string | null {
  // Format: "11/12/2025 - 21:00" or "11/12/2025"
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/)
  if (!match) return null

  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = match[3]
  const hour = match[4] ? match[4].padStart(2, '0') : '20'
  const minute = match[5] || '00'

  return `${year}-${month}-${day}T${hour}:${minute}:00`
}

export async function runElCabongScrape(input: ScraperInput): Promise<ElCabongScrapeResult> {
  const valid: EventInput[] = []
  let invalid_count = 0
  let items_fetched = 0
  const seenIds = new Set<string>()

  console.log('Scraping El Cabong agenda with Playwright...')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto('https://elcabong.com.br/agenda/', { waitUntil: 'networkidle' })
    console.log('Page loaded')

    // Click "Load more events" button until it disappears or max clicks reached
    let clickCount = 0
    const maxClicks = 50

    while (clickCount < maxClicks) {
      // Try multiple selectors for the load more button
      const loadMoreButton = page.locator('button:has-text("Load more"), a:has-text("Load more"), .load_more_events, [class*="load-more"], strong:has-text("Load more")').first()
      
      const isVisible = await loadMoreButton.isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`  Button visible: ${isVisible}`)
      
      if (isVisible) {
        console.log(`  Clicking "Load more events" (${clickCount + 1})...`)
        await loadMoreButton.click()
        await page.waitForTimeout(2000) // Wait for content to load
        clickCount++
      } else {
        console.log('  No more "Load more events" button found')
        break
      }
    }

    console.log(`  Clicked ${clickCount} times, now extracting events...`)

    // Extract all events from the page - look for event links and their associated data
    const events = await page.evaluate(() => {
      const results: Array<{
        title: string | null
        dateStr: string | null
        location: string | null
        url: string | null
        imageUrl: string | null
      }> = []

      // Find all event links (format: /event/event-name/)
      const eventLinks = document.querySelectorAll('a[href*="/event/"]')
      const seenUrls = new Set<string>()

      eventLinks.forEach((link) => {
        const url = link.getAttribute('href')
        if (!url || seenUrls.has(url)) return
        seenUrls.add(url)

        // Find the parent container that has the event info
        const container = link.closest('.wpem-event-box-col') || 
                         link.closest('.wpem-event-action-url')?.parentElement?.parentElement ||
                         link.parentElement?.parentElement

        if (!container) return

        // Try to extract title from h3 or link text
        const titleEl = container.querySelector('.wpem-heading-text') || 
                       container.querySelector('h3') ||
                       link
        const title = titleEl?.textContent?.trim() || null

        // Extract date
        const dateEl = container.querySelector('.wpem-event-date-time-text')
        const dateStr = dateEl?.textContent?.replace(/\s+/g, ' ').trim() || null

        // Extract location
        const locationEl = container.querySelector('.wpem-event-location-text')
        const location = locationEl?.textContent?.replace(/\s+/g, ' ').trim() || null

        // Extract image
        const imgEl = container.querySelector('img')
        const imageUrl = imgEl?.getAttribute('src') || null

        if (title && title.length > 3) {
          results.push({ title, dateStr, location, url, imageUrl })
        }
      })

      return results
    })

    console.log(`  Found ${events.length} events on page`)

    for (const ev of events) {
      if (!ev.title || !ev.dateStr) continue

      const startDatetime = parseElCabongDate(ev.dateStr)
      if (!startDatetime) {
        invalid_count++
        continue
      }

      const externalId = `elcabong-${Buffer.from(ev.title + ev.dateStr).toString('base64').slice(0, 20)}`

      if (seenIds.has(externalId)) continue
      seenIds.add(externalId)

      valid.push({
        source: 'elcabong',
        external_id: externalId,
        title: ev.title,
        start_datetime: startDatetime,
        city: input.city,
        venue_name: ev.location || undefined,
        image_url: ev.imageUrl || undefined,
        category: 'Shows e Festas',
        is_free: false,
        url: ev.url || 'https://elcabong.com.br/agenda/',
        raw_payload: ev,
      })
      items_fetched++
    }
  } catch (err) {
    console.error('Error scraping El Cabong:', err)
    invalid_count++
  } finally {
    await browser.close()
  }

  console.log(`\nEl Cabong scrape complete: ${valid.length} valid, ${invalid_count} invalid`)

  return { valid, invalid_count, items_fetched }
}
