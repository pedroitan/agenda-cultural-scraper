import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { parseInstagramPost } from './instagram.js'
import { EventInput } from './types.js'

const RSSHUB_URL = 'https://rsshub.app/instagram/user/agendaalternativasalvador'
const INSTAGRAM_PROFILE = 'agendaalternativasalvador'
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_PROFILE}/`

// Helper function for random delays (more human-like)
function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

interface RSSItem {
  title: string
  link: string
  pubDate: string
  content: string
  guid: string
}

interface RSSFeed {
  items: RSSItem[]
}

async function fetchRSSFeed(): Promise<RSSFeed | null> {
  try {
    console.log(`Fetching RSS feed from: ${RSSHUB_URL}`)
    
    const response = await fetch(RSSHUB_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      console.error(`RSS feed fetch failed: ${response.status} ${response.statusText}`)
      return null
    }

    const xml = await response.text()
    
    // Simple XML parsing for RSS
    const items: RSSItem[] = []
    const itemMatches = xml.matchAll(/<item>(.*?)<\/item>/gs)
    
    for (const match of itemMatches) {
      const itemXml = match[1]
      
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1] || ''
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
      const content = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s)?.[1] || ''
      const guid = itemXml.match(/<guid.*?>(.*?)<\/guid>/)?.[1] || link
      
      items.push({ title, link, pubDate, content, guid })
    }

    console.log(`✅ Fetched ${items.length} posts from RSS feed`)
    return { items }
  } catch (error) {
    console.error('Error fetching RSS feed:', error)
    return null
  }
}

async function fetchInstagramDirectly(): Promise<RSSFeed | null> {
  console.log(`\n⚠️  RSSHub failed, trying direct Instagram scraping with Playwright...`)
  
  // Use headless: false for local debugging, true for production
  const isDebugMode = process.env.INSTAGRAM_DEBUG === 'true'
  const browser = await chromium.launch({ 
    headless: !isDebugMode,
    slowMo: isDebugMode ? 100 : 0,
  })
  
  try {
    // Try to load saved cookies for persistent session
    const fs = await import('fs')
    const cookiesPath = 'instagram-cookies.json'
    let context
    
    if (fs.existsSync(cookiesPath)) {
      console.log('📂 Loading saved Instagram session...')
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'))
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      })
      await context.addCookies(cookies)
    } else {
      console.log('⚠️  No saved session found. You need to login manually first.')
      console.log('💡 Run with INSTAGRAM_DEBUG=true and login manually in the browser.')
      console.log('💡 After successful login, cookies will be saved automatically.')
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      })
    }
    
    const page = await context.newPage()

    // Optional: Login if credentials are provided
    const igUsername = process.env.INSTAGRAM_USERNAME
    const igPassword = process.env.INSTAGRAM_PASSWORD
    
    if (igUsername && igPassword) {
      console.log(`Logging in as ${igUsername}...`)
      
      await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 45000 })
      await randomDelay(2000, 4000)
      
      // Wait for login form to be visible
      await page.waitForSelector('input[name="username"]', { timeout: 15000 })
      await randomDelay(500, 1500)
      
      // Fill login form with human-like typing
      await page.click('input[name="username"]')
      await randomDelay(300, 800)
      await page.type('input[name="username"]', igUsername, { delay: 100 })
      await randomDelay(500, 1000)
      
      await page.click('input[name="password"]')
      await randomDelay(300, 800)
      await page.type('input[name="password"]', igPassword, { delay: 120 })
      await randomDelay(800, 1500)
      
      await page.click('button[type="submit"]')
      console.log('Waiting for login to complete...')
      
      // Wait for navigation after login
      await randomDelay(6000, 10000)
      
      // Check for login error
      const errorMessage = await page.$eval('div#slfErrorAlert', (el) => el.textContent).catch(() => null)
      if (errorMessage) {
        console.error(`❌ Login error: ${errorMessage}`)
        console.log('⚠️  Verifique se a senha está correta no .env')
        console.log('⚠️  Instagram pode estar bloqueando login automatizado')
        console.log('⚠️  Considere desabilitar 2FA ou usar App Password')
        return null
      }
      
      // Handle "Save Your Login Info?" popup
      await page.click('button:has-text("Not Now")').catch(() => {})
      await page.click('button:has-text("Agora não")').catch(() => {})
      await page.waitForTimeout(2000)
      
      // Handle "Turn on Notifications?" popup
      await page.click('button:has-text("Not Now")').catch(() => {})
      await page.click('button:has-text("Agora não")').catch(() => {})
      await page.waitForTimeout(1000)
      
      console.log('✅ Logged in successfully')
      
      // Save cookies for future use
      const cookies = await context.cookies()
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2))
      console.log('💾 Session cookies saved for future use')
    }

    console.log(`Navigating to ${INSTAGRAM_URL}`)
    await page.goto(INSTAGRAM_URL, { waitUntil: 'networkidle', timeout: 30000 })
    
    // Try to close login popup if it appears
    await page.click('button:has-text("Not Now")').catch(() => {})
    await page.click('button:has-text("Agora não")').catch(() => {})
    
    // Wait a bit for page to settle
    await page.waitForTimeout(2000)
    
    // Get multiple posts (first might be pinned)
    let postLinks: string[] = []
    
    // Try to get all post links
    postLinks = await page.$$eval('article a[href*="/p/"]', (elements) => 
      elements.map(el => el.getAttribute('href')).filter(href => href !== null) as string[]
    ).catch(() => [])
    
    // Fallback: try main selector
    if (postLinks.length === 0) {
      postLinks = await page.$$eval('main a[href*="/p/"]', (elements) => 
        elements.map(el => el.getAttribute('href')).filter(href => href !== null) as string[]
      ).catch(() => [])
    }
    
    // Fallback: try any link
    if (postLinks.length === 0) {
      postLinks = await page.$$eval('a[href*="/p/"]', (elements) => 
        elements.map(el => el.getAttribute('href')).filter(href => href !== null) as string[]
      ).catch(() => [])
    }
    
    if (postLinks.length === 0) {
      console.error('❌ Could not find any post links. Instagram may be blocking access.')
      console.log('Page title:', await page.title())
      return null
    }

    // Try second post first (first might be pinned), fallback to first if only one exists
    const postToUse = postLinks.length > 1 ? postLinks[1] : postLinks[0]
    const fullPostUrl = `https://www.instagram.com${postToUse}`
    console.log(`✅ Found ${postLinks.length} posts, using: ${fullPostUrl}`)

    // Navigate to post
    await page.goto(fullPostUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    // Try to close login popup again
    await page.click('button:has-text("Not Now")').catch(() => {})
    await page.click('button:has-text("Agora não")').catch(() => {})

    // Try multiple selectors for caption
    let caption = ''
    
    // Try selector 1: h1
    caption = await page.$eval('h1', (el) => el.textContent || '').catch(() => '')
    
    // Try selector 2: span with long text
    if (!caption) {
      const spans = await page.$$eval('span', (elements) => 
        elements.map(el => el.textContent || '').filter(text => text.length > 50)
      ).catch(() => [])
      caption = spans[0] || ''
    }
    
    if (!caption) {
      console.error('❌ Could not extract caption text')
      return null
    }

    console.log(`✅ Extracted caption (${caption.length} chars)`)

    // Create RSS-like item
    const postId = postToUse.match(/\/p\/([^\/]+)/)?.[1] || ''
    const item: RSSItem = {
      title: caption.substring(0, 100),
      link: fullPostUrl,
      pubDate: new Date().toISOString(),
      content: caption,
      guid: postId,
    }

    return { items: [item] }
  } catch (error) {
    console.error('Error scraping Instagram directly:', error)
    return null
  } finally {
    await browser.close()
  }
}

async function getLastProcessedPostId(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from('instagram_posts_processed')
    .select('post_id')
    .order('processed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching last processed post:', error)
    return null
  }

  return data?.post_id || null
}

async function markPostAsProcessed(supabase: any, postId: string, postUrl: string): Promise<void> {
  const { error } = await supabase
    .from('instagram_posts_processed')
    .insert({
      post_id: postId,
      post_url: postUrl,
    })

  if (error) {
    console.error('Error marking post as processed:', error)
  }
}

async function upsertEvents(supabase: any, events: EventInput[]): Promise<void> {
  if (events.length === 0) return

  console.log(`Upserting ${events.length} events to Supabase...`)

  const { error } = await supabase
    .from('events')
    .upsert(events, {
      onConflict: 'external_id',
      ignoreDuplicates: false,
    })

  if (error) {
    console.error('Error upserting events:', error)
  } else {
    console.log(`✅ Successfully upserted ${events.length} events`)
  }
}

export async function runInstagramMonitor(): Promise<void> {
  console.log('='.repeat(60))
  console.log('INSTAGRAM MONITOR - @agendaalternativasalvador')
  console.log('='.repeat(60))

  // Initialize Supabase
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Try RSS feed first, fallback to Playwright if it fails
  let feed = await fetchRSSFeed()
  
  if (!feed || feed.items.length === 0) {
    console.log('⚠️  RSS feed failed, trying Playwright fallback...')
    feed = await fetchInstagramDirectly()
    
    if (!feed || feed.items.length === 0) {
      console.log('❌ Both RSS and Playwright failed. No posts found.')
      return
    }
  }

  // Get last processed post
  const lastProcessedId = await getLastProcessedPostId(supabase)
  console.log(`Last processed post ID: ${lastProcessedId || 'none'}`)

  // Get latest post
  const latestPost = feed.items[0]
  console.log(`\nLatest post:`)
  console.log(`  ID: ${latestPost.guid}`)
  console.log(`  URL: ${latestPost.link}`)
  console.log(`  Date: ${latestPost.pubDate}`)
  console.log(`  Title: ${latestPost.title.substring(0, 50)}...`)

  // Check if already processed
  if (latestPost.guid === lastProcessedId) {
    console.log('\n✅ Latest post already processed. Nothing to do.')
    return
  }

  // New post! Parse and extract events
  console.log('\n🆕 New post detected! Parsing events...')
  
  // Clean HTML from content
  const textContent = latestPost.content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()

  const events = parseInstagramPost(textContent, latestPost.link)

  if (events.length === 0) {
    console.log('⚠️  No events extracted from post')
  } else {
    console.log(`\n📅 Extracted ${events.length} events:`)
    events.forEach((ev, i) => {
      console.log(`  ${i + 1}. ${ev.title} - ${ev.venue_name || 'N/A'}`)
    })

    // Upsert events to database
    await upsertEvents(supabase, events)
  }

  // Mark post as processed
  await markPostAsProcessed(supabase, latestPost.guid, latestPost.link)
  console.log(`\n✅ Post marked as processed`)

  console.log('\n' + '='.repeat(60))
  console.log('MONITOR COMPLETED')
  console.log('='.repeat(60))
}
