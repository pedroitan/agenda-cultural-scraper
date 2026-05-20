import { chromium } from 'playwright'
import type { EventInput, ScraperInput } from './types.js'
import { uploadImageBuffer } from './utils/image-uploader.js'

type ElCabongScrapeResult = {
  valid: EventInput[]
  invalid_count: number
  items_fetched: number
}

// Extract additional details from an event detail page
async function extractEventDetails(page: any, url: string): Promise<{
  description?: string
  performers?: string
  duration?: string
  age_restriction?: string
  organizer?: string
}> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1000)

    const details = await page.evaluate(() => {
      const result: any = {}

      // Description - try multiple selectors
      const descSelectors = [
        '.wpem-event-description',
        '.event-description',
        '.description',
        'div[class*="description"]',
        '.wpem-single-event-description'
      ]
      for (const selector of descSelectors) {
        const el = document.querySelector(selector) as HTMLElement
        if (el) {
          result.description = el.textContent?.trim()
          break
        }
      }

      // Performers/Artists
      const perfSelectors = [
        '.wpem-event-performer',
        '.event-performer',
        '[class*="performer"]',
        '[class*="artist"]'
      ]
      for (const selector of perfSelectors) {
        const el = document.querySelector(selector) as HTMLElement
        if (el) {
          result.performers = el.textContent?.trim()
          break
        }
      }

      // Duration
      const durSelectors = [
        '.wpem-event-duration',
        '.event-duration',
        '[class*="duration"]'
      ]
      for (const selector of durSelectors) {
        const el = document.querySelector(selector) as HTMLElement
        if (el) {
          result.duration = el.textContent?.trim()
          break
        }
      }

      // Age restriction
      const ageSelectors = [
        '.wpem-event-age',
        '.event-age',
        '[class*="age"]',
        '[class*="classification"]'
      ]
      for (const selector of ageSelectors) {
        const el = document.querySelector(selector) as HTMLElement
        if (el) {
          result.age_restriction = el.textContent?.trim()
          break
        }
      }

      // Organizer
      const orgSelectors = [
        '.wpem-event-organizer',
        '.event-organizer',
        '[class*="organizer"]',
        '[class*="organizer-name"]'
      ]
      for (const selector of orgSelectors) {
        const el = document.querySelector(selector) as HTMLElement
        if (el) {
          result.organizer = el.textContent?.trim()
          break
        }
      }

      return result
    })

    return details
  } catch (err) {
    console.error(`  Error extracting details from ${url}:`, err)
    return {}
  }
}

// Parse date like "28-01-2026 @ 19:00" or "11/12/2025 - 21:00" to ISO string
function parseElCabongDate(dateStr: string): string | null {
  // Format 1: "28-01-2026 @ 19:00" (new format with dashes and @)
  let match = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{4})(?:\s*@\s*(\d{1,2}):(\d{2}))?/)
  
  // Format 2: "11/12/2025 - 21:00" (old format with slashes and -)
  if (!match) {
    match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/)
  }
  
  if (!match) return null

  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = match[3]
  const hour = match[4] ? match[4].padStart(2, '0') : null // null = time not available
  const minute = match[5] || '00'
  const timeStr = hour ? `${hour}:${minute}:00` : '00:00:00'

  return `${year}-${month}-${day}T${timeStr}`
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
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  })

  try {
    // Use domcontentloaded to avoid timeout in CI, then wait for content
    await page.goto('https://elcabong.com.br/agenda/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    console.log('Page loaded')

    // Close any popups that might appear
    try {
      // Wait a bit for popup to appear
      await page.waitForTimeout(2000)
      
      // Try common popup close selectors
      const closeSelectors = [
        '.popup-close',
        '.modal-close',
        '[aria-label="Close"]',
        'button[class*="close"]',
        '.fancybox-close',
        '#close-popup',
        '.mfp-close'
      ]
      
      for (const selector of closeSelectors) {
        const closeButton = page.locator(selector).first()
        if (await closeButton.count() > 0 && await closeButton.isVisible().catch(() => false)) {
          await closeButton.click()
          console.log(`  Closed popup using selector: ${selector}`)
          await page.waitForTimeout(1000)
          break
        }
      }
    } catch (e) {
      console.log('  No popup to close or already closed')
    }

    // Wait for event elements to appear
    try {
      await page.waitForSelector('.wpem-event-box-col', { timeout: 15000 })
      console.log('  Event elements found')
    } catch {
      console.log('  No event elements found, waiting longer...')
      await page.waitForTimeout(5000)
    }

    // Intercept AJAX responses to diagnose load-more issues
    const ajaxResponses: { status: number; url: string; bodyLen: number }[] = []
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('admin-ajax') || url.includes('load_more') || url.includes('wpem')) {
        try {
          const body = await response.text()
          ajaxResponses.push({ status: response.status(), url, bodyLen: body.length })
        } catch {}
      }
    })

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

      // Use Playwright's click which handles scrolling and waiting
      ajaxResponses.length = 0
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
      await page.waitForTimeout(3000)
      
      // Wait for event count to increase
      const newEventCount = await page.locator('.wpem-event-box-col').count()
      const ajaxInfo = ajaxResponses.length > 0
        ? `, ajax: ${ajaxResponses.map(r => `${r.status}(${r.bodyLen}b)`).join(', ')}`
        : ', ajax: none'
      console.log(`  Click ${loadMoreAttempts + 1}: ${prevEventCount} → ${newEventCount} events${ajaxInfo}`)
      
      if (newEventCount <= prevEventCount) {
        console.log('  No new events loaded, stopping')
        // Log the button state for debugging
        const btnText = await button.textContent().catch(() => 'N/A')
        const btnDisplay = await page.evaluate(() => {
          const b = document.querySelector('#load_more_events') as HTMLElement
          return b ? { display: getComputedStyle(b).display, disabled: (b as HTMLButtonElement).disabled, innerHTML: b.innerHTML.slice(0, 200) } : null
        })
        console.log(`  Button text: "${btnText}", state: ${JSON.stringify(btnDisplay)}`)
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

        // Try multiple selectors for image URL
        let imageUrl: string | null = null
        const bannerImg = event.querySelector('.wpem-event-banner-img') as HTMLElement
        if (bannerImg) {
          // Try SpeedyCache attribute first
          imageUrl = bannerImg.getAttribute('data-speedycache-original-src')
          // Try background-image style
          if (!imageUrl && bannerImg.style?.backgroundImage) {
            imageUrl = bannerImg.style.backgroundImage
              .replace(/url\(["']?/, '')
              .replace(/["']?\)$/, '')
          }
          // Try src attribute
          if (!imageUrl) {
            const imgElement = bannerImg.querySelector('img') as HTMLImageElement
            if (imgElement?.src) {
              imageUrl = imgElement.src
            }
          }
          // Try data-src attribute (lazy loading)
          if (!imageUrl) {
            imageUrl = bannerImg.getAttribute('data-src')
          }
        }

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

    // Parse all events (no I/O)
    type ParsedEvent = { externalId: string; title: string; startDatetime: string; location: string; url: string; imageUrl: string | null; raw: typeof events[0] }
    const parsed: ParsedEvent[] = []
    for (const ev of events) {
      if (!ev.title || !ev.date) continue
      const dateTimeStr = ev.time ? `${ev.date} - ${ev.time}` : ev.date
      const startDatetime = parseElCabongDate(dateTimeStr)
      if (!startDatetime) { invalid_count++; continue }
      const externalId = `elcabong-${Buffer.from(ev.title + ev.date).toString('base64').slice(0, 20)}`
      if (seenIds.has(externalId)) continue
      seenIds.add(externalId)
      parsed.push({ externalId, title: ev.title, startDatetime, location: ev.location!, url: ev.url!, imageUrl: ev.imageUrl, raw: ev })
    }

    console.log(`  Extracted ${parsed.length} events from list`)
    console.log(`  Visiting detail pages to extract additional info...`)

    // Visit each event detail page to extract additional information
    for (let i = 0; i < parsed.length; i++) {
      const ev = parsed[i]
      console.log(`  [${i + 1}/${parsed.length}] Fetching details for: ${ev.title}`)
      const details = await extractEventDetails(page, ev.url)
      await page.waitForTimeout(500) // Rate limiting between requests

      valid.push({
        source: 'elcabong',
        external_id: ev.externalId,
        title: ev.title,
        start_datetime: ev.startDatetime,
        city: input.city,
        venue_name: ev.location || undefined,
        image_url: ev.imageUrl || undefined,
        category: 'Shows e Festas',
        is_free: false,
        url: ev.url,
        description: details.description,
        performers: details.performers,
        duration: details.duration,
        age_restriction: details.age_restriction,
        organizer: details.organizer,
        raw_payload: { ...ev.raw, details },
      })
      items_fetched++
    }

    // Close browser after fetching all details
    await browser.close()
    console.log(`  Browser closed.`)
  } catch (err) {
    console.error('Error scraping El Cabong:', err)
    invalid_count++
  } finally {
    if (browser.isConnected()) await browser.close()
  }

  console.log(`\nEl Cabong scrape complete: ${valid.length} valid, ${invalid_count} invalid`)

  return { valid, invalid_count, items_fetched }
}
