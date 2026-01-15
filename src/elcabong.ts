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
    await page.goto('https://elcabong.com.br/agenda/', { waitUntil: 'networkidle', timeout: 60000 })
    console.log('Page loaded')

    // Wait for initial content
    await page.waitForTimeout(3000)

    // Debug: log page content
    const pageTitle = await page.title()
    console.log(`  Page title: ${pageTitle}`)

    // Click "Load more events" button until no more events load
    let clickCount = 0
    const maxClicks = 100
    let previousEventCount = 0

    // Initial event count
    const initialCount = await page.locator('a[href*="/event/"]').count()
    console.log(`  Initial events on page: ${initialCount}`)

    while (clickCount < maxClicks) {
      // Use the exact selector: #load_more_events
      const loadMoreButton = page.locator('#load_more_events').first()
      
      // Wait for button to be visible
      try {
        await loadMoreButton.waitFor({ state: 'visible', timeout: 5000 })
      } catch {
        console.log('  Load more button not found, stopping')
        break
      }

      const currentEventCount = await page.locator('a[href*="/event/"]').count()
      console.log(`  Events: ${currentEventCount}, clicking Load more (${clickCount + 1})`)
      
      // Click and wait for network to settle
      await loadMoreButton.click()
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(1500)
      clickCount++
      
      // Check if new events were loaded
      const newEventCount = await page.locator('a[href*="/event/"]').count()
      if (newEventCount === previousEventCount && clickCount > 5) {
        console.log(`  No new events loaded (still ${newEventCount}), stopping`)
        break
      }
      previousEventCount = newEventCount
    }

    const finalCount = await page.locator('a[href*="/event/"]').count()
    console.log(`  Clicked ${clickCount} times, final events: ${finalCount}`)

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
