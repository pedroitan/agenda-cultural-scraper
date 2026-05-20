import 'dotenv/config'
import { chromium } from 'playwright'
import { supabase } from './src/supabase.js'

async function main() {
  console.log('========== Fixing El Cabong orphan events (visiting individual URLs) ==========\n')
  
  // Get future events without images
  const now = new Date().toISOString()
  const { data: orphans } = await supabase
    .from('events')
    .select('id, title, url, start_datetime')
    .eq('source', 'elcabong')
    .is('image_url', null)
    .gte('start_datetime', now)
    .order('start_datetime', { ascending: true })
  
  if (!orphans || orphans.length === 0) {
    console.log('No future orphan events!')
    return
  }
  
  console.log(`Found ${orphans.length} future events without images\n`)
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  
  let fixed = 0
  let failed = 0
  
  for (let i = 0; i < orphans.length; i++) {
    const ev = orphans[i]
    if (!ev.url || !ev.url.includes('elcabong.com.br')) {
      console.log(`⏭️  [${i + 1}/${orphans.length}] Skipping (no valid URL): ${ev.title.substring(0, 50)}`)
      continue
    }
    
    try {
      const page = await context.newPage()
      await page.goto(ev.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      })
      
      // Try multiple selectors for the event image
      const imageUrl = await page.evaluate(() => {
        // Try og:image meta tag first (most reliable)
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
        if (ogImage) return ogImage
        
        // Try featured image
        const featuredImg = document.querySelector('.wpem-event-banner-img img') as HTMLImageElement
        if (featuredImg?.src) return featuredImg.src
        
        // Try wp event banner background-image
        const bannerEl = document.querySelector('.wpem-event-banner-img') as HTMLElement
        if (bannerEl?.style?.backgroundImage) {
          return bannerEl.style.backgroundImage
            .replace(/url\(["']?/, '')
            .replace(/["']?\)$/, '')
        }
        
        // Try first content image
        const contentImg = document.querySelector('.entry-content img, article img') as HTMLImageElement
        if (contentImg?.src) return contentImg.src
        
        return null
      })
      
      await page.close()
      
      if (imageUrl) {
        const { error } = await supabase
          .from('events')
          .update({ image_url: imageUrl })
          .eq('id', ev.id)
        
        if (error) {
          console.log(`❌ [${i + 1}/${orphans.length}] DB error: ${ev.title.substring(0, 50)}`)
          failed++
        } else {
          console.log(`✅ [${i + 1}/${orphans.length}] ${ev.title.substring(0, 50)}`)
          fixed++
        }
      } else {
        console.log(`⚠️  [${i + 1}/${orphans.length}] No image found: ${ev.title.substring(0, 50)}`)
        failed++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`❌ [${i + 1}/${orphans.length}] Error: ${ev.title.substring(0, 50)} - ${msg.substring(0, 60)}`)
      failed++
    }
  }
  
  await browser.close()
  
  console.log(`\n========== Summary ==========`)
  console.log(`Fixed: ${fixed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total: ${orphans.length}`)
}

main().catch(console.error)
