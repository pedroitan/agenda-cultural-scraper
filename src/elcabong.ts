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

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  try {
    // Use domcontentloaded to avoid timeout in CI, then wait for content
    await page.goto('https://elcabong.com.br/agenda/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    console.log('Page loaded')

    // Wait for event elements to appear
    try {
      await page.waitForSelector('.wpem-event-box-col', { timeout: 15000 })
      console.log('  Event elements found')
    } catch {
      console.log('  No event elements found, waiting longer...')
      await page.waitForTimeout(5000)
    }

    // Scroll to bottom to ensure button is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)

    // Click "Load more events" button until no more events load
    let loadMoreAttempts = 0
    const maxAttempts = 50

    while (loadMoreAttempts < maxAttempts) {
      // Get current event count
      const prevEventCount = await page.locator('.wpem-event-box-col').count()
      
      // Try to find and click the button using Playwright's click
      const button = page.locator('#load_more_events')
      const buttonCount = await button.count()
      
      if (buttonCount === 0) {
        console.log('  Load more button not found in DOM')
        break
      }

      // Check if button is visible
      const isVisible = await button.isVisible().catch(() => false)
      console.log(`  Current events: ${prevEventCount}, button visible: ${isVisible}, clicking (attempt ${loadMoreAttempts + 1})`)

      // Use Playwright's click which handles scrolling and waiting
      try {
        await button.click({ timeout: 5000 })
      } catch (e) {
        console.log('  Playwright click failed, trying JS click')
        await page.evaluate(() => {
          const btn = document.querySelector('#load_more_events') as HTMLElement
          btn?.click()
        })
      }

      // Wait for AJAX
      await page.waitForTimeout(2000)
      
      // Wait for event count to increase
      const newEventCount = await page.locator('.wpem-event-box-col').count()
      console.log(`  Events after click: ${newEventCount}`)
      
      if (newEventCount <= prevEventCount) {
        console.log('  No new events loaded, stopping')
        break
      }

      loadMoreAttempts++
    }

    if (loadMoreAttempts === maxAttempts) {
      console.log('  Reached maximum load more attempts')
    }

    const finalCount = await page.locator('.wpem-event-box-col').count()
    console.log(`  Clicked ${loadMoreAttempts} times, final events: ${finalCount}`)

    // Extract all events using the exact selectors from working scraper
    const events = await page.evaluate(() => {
      const results: Array<{
        title: string | null
        date: string | null
        time: string | null
        location: string | null
        url: string | null
        imageUrl: string | null
      }> = []

      const eventElements = document.querySelectorAll('.wpem-event-box-col')

      eventElements.forEach(event => {
        const title = (event.querySelector('.wpem-event-title') as HTMLElement)?.textContent?.trim() || null
        const datetime = (event.querySelector('.wpem-event-date-time') as HTMLElement)?.textContent?.trim() || null
        const [date, time] = datetime ? datetime.split(' - ') : [null, null]
        const location = (event.querySelector('.wpem-event-location') as HTMLElement)?.textContent?.trim() || null
        const link = (event.querySelector('a.wpem-event-action-url') as HTMLAnchorElement)?.href || null
        const bannerImg = event.querySelector('.wpem-event-banner-img') as HTMLElement
        const imageUrl = bannerImg?.style?.backgroundImage
          ?.replace(/url\(["']?/, '')
          ?.replace(/["']?\)$/, '') || null

        if (title && date && location && link) {
          results.push({
            title,
            date: date?.trim() || null,
            time: time?.trim() || null,
            location,
            url: link,
            imageUrl
          })
        }
      })

      return results
    })

    console.log(`  Found ${events.length} events on page`)

    for (const ev of events) {
      if (!ev.title || !ev.date) continue

      // Combine date and time for parsing
      const dateTimeStr = ev.time ? `${ev.date} - ${ev.time}` : ev.date
      const startDatetime = parseElCabongDate(dateTimeStr)
      if (!startDatetime) {
        invalid_count++
        continue
      }

      const externalId = `elcabong-${Buffer.from(ev.title + ev.date).toString('base64').slice(0, 20)}`

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
