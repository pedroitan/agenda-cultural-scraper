import { chromium } from 'playwright'

// Use a real El Cabong event URL
const testUrl = 'https://elcabong.com.br/evento/luciano-sanfoneiro-e-trio-seu-malaquias/'

console.log('Inspecting El Cabong event page...')
console.log('URL:', testUrl)
console.log('')

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage()

try {
  await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  // Get all text content to see what's available
  const pageText = await page.evaluate(() => {
    const result: any = {}
    
    // Try to find description
    const descSelectors = [
      '.wpem-event-description',
      '.event-description',
      '.description',
      'div[class*="description"]',
      '.wpem-single-event-description',
      'article .entry-content',
      '.wpem-event-content'
    ]
    for (const selector of descSelectors) {
      const el = document.querySelector(selector) as HTMLElement
      if (el && el.textContent?.trim().length > 10) {
        result.description = {
          selector,
          text: el.textContent?.trim().slice(0, 200)
        }
        break
      }
    }

    // Try to find performers
    const perfSelectors = [
      '.wpem-event-performer',
      '.event-performer',
      '[class*="performer"]',
      '[class*="artist"]',
      '.wpem-event-artist'
    ]
    for (const selector of perfSelectors) {
      const el = document.querySelector(selector) as HTMLElement
      if (el && el.textContent?.trim().length > 2) {
        result.performers = {
          selector,
          text: el.textContent?.trim()
        }
        break
      }
    }

    // Try to find duration
    const durSelectors = [
      '.wpem-event-duration',
      '.event-duration',
      '[class*="duration"]'
    ]
    for (const selector of durSelectors) {
      const el = document.querySelector(selector) as HTMLElement
      if (el && el.textContent?.trim().length > 2) {
        result.duration = {
          selector,
          text: el.textContent?.trim()
        }
        break
      }
    }

    // Try to find age restriction
    const ageSelectors = [
      '.wpem-event-age',
      '.event-age',
      '[class*="age"]',
      '[class*="classification"]'
    ]
    for (const selector of ageSelectors) {
      const el = document.querySelector(selector) as HTMLElement
      if (el && el.textContent?.trim().length > 2) {
        result.age_restriction = {
          selector,
          text: el.textContent?.trim()
        }
        break
      }
    }

    // Try to find organizer
    const orgSelectors = [
      '.wpem-event-organizer',
      '.event-organizer',
      '[class*="organizer"]',
      '[class*="producer"]'
    ]
    for (const selector of orgSelectors) {
      const el = document.querySelector(selector) as HTMLElement
      if (el && el.textContent?.trim().length > 2) {
        result.organizer = {
          selector,
          text: el.textContent?.trim()
        }
        break
      }
    }

    // Get all class names containing key words
    const allElements = document.querySelectorAll('*')
    const relevantClasses: string[] = []
    allElements.forEach(el => {
      const classes = (el as HTMLElement).className
      if (typeof classes === 'string') {
        if (classes.includes('description') || classes.includes('performer') || 
            classes.includes('artist') || classes.includes('duration') || 
            classes.includes('age') || classes.includes('organizer') ||
            classes.includes('producer')) {
          relevantClasses.push(classes)
        }
      }
    })
    result.relevant_classes = [...new Set(relevantClasses)].slice(0, 20)

    return result
  })

  console.log('Extraction results:')
  console.log(JSON.stringify(pageText, null, 2))
  
  console.log('\nPress Enter to close browser...')
  await new Promise(resolve => process.stdin.once('data', resolve))
  
} catch (err) {
  console.error('Error:', err)
} finally {
  await browser.close()
}
