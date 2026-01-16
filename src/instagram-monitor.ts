import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import { parseInstagramPost } from './instagram.js'
import { EventInput } from './types.js'

const RSSHUB_URL = 'https://rsshub.app/instagram/user/agendaalternativasalvador'
const INSTAGRAM_PROFILE = 'agendaalternativasalvador'
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_PROFILE}/`

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
  
  const browser = await chromium.launch({ headless: true })
  
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    })

    console.log(`Navigating to ${INSTAGRAM_URL}`)
    await page.goto(INSTAGRAM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    
    // Wait for posts to load
    await page.waitForSelector('article', { timeout: 10000 }).catch(() => {
      console.log('Could not find article elements')
    })

    // Get first post link
    const firstPostLink = await page.$eval('article a[href*="/p/"]', (el) => el.getAttribute('href'))
    
    if (!firstPostLink) {
      console.error('Could not find first post link')
      return null
    }

    const fullPostUrl = `https://www.instagram.com${firstPostLink}`
    console.log(`Found first post: ${fullPostUrl}`)

    // Navigate to post
    await page.goto(fullPostUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    
    // Wait for caption
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {
      console.log('Could not find caption')
    })

    // Extract caption text
    const caption = await page.$eval('h1', (el) => el.textContent || '').catch(() => '')
    
    if (!caption) {
      console.error('Could not extract caption text')
      return null
    }

    console.log(`✅ Extracted caption (${caption.length} chars)`)

    // Create RSS-like item
    const postId = firstPostLink.match(/\/p\/([^\/]+)/)?.[1] || ''
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
