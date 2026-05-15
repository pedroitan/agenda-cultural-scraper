import { InstagramApifyScraper } from './scrapers/instagram-apify/instagram-apify-scraper.js'
import { supabase } from './supabase.js'
import type { ScraperInput, EventInput } from './types.js'
import { randomUUID } from 'crypto'

const STORAGE_BUCKET = 'events'
const DOWNLOAD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
}

/**
 * Download Instagram CDN image and upload to Supabase Storage.
 * Instagram CDN URLs expire and block hotlinking, so we must mirror them.
 * Returns the public Supabase Storage URL, or null on failure.
 */
async function mirrorInstagramImage(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { headers: DOWNLOAD_HEADERS })
    if (!response.ok) {
      console.log(`   ⚠️ Image download failed: HTTP ${response.status}`)
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const filename = `instagram/${randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, { contentType, upsert: false })

    if (error) {
      console.log(`   ⚠️ Image upload failed: ${error.message}`)
      return null
    }

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
    return urlData.publicUrl
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`   ⚠️ Image mirror error: ${msg}`)
    return null
  }
}

/**
 * Mirror all Instagram CDN images to Supabase Storage.
 * Deduplicates by URL — events sharing the same image only download once.
 */
async function mirrorImagesToStorage(events: EventInput[]): Promise<EventInput[]> {
  const cdnEvents = events.filter(
    e => e.image_url && e.image_url.includes('cdninstagram.com')
  )
  if (cdnEvents.length === 0) return events

  console.log(`\n📥 Mirroring ${cdnEvents.length} Instagram CDN images to Supabase Storage...`)

  // Deduplicate: same image used by multiple events should be downloaded once
  const urlMap = new Map<string, string | null>()
  const uniqueUrls = [...new Set(cdnEvents.map(e => e.image_url!))]

  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i]
    console.log(`   [${i + 1}/${uniqueUrls.length}] Mirroring image...`)
    const mirroredUrl = await mirrorInstagramImage(url)
    urlMap.set(url, mirroredUrl)
    if (mirroredUrl) {
      console.log(`   ✅ ${mirroredUrl.substring(0, 80)}`)
    }
  }

  // Replace CDN URLs in events with mirrored URLs (or keep original if mirror failed)
  return events.map(ev => {
    if (!ev.image_url || !ev.image_url.includes('cdninstagram.com')) return ev
    const mirrored = urlMap.get(ev.image_url)
    return mirrored ? { ...ev, image_url: mirrored } : ev
  })
}

/**
 * Wrapper para Instagram Apify Scraper
 * Integra com o sistema de scrapers principal
 */
export async function runInstagramApifyScrape(input: ScraperInput) {
  const config = {
    username: process.env.INSTAGRAM_USERNAME || 'agendaalternativasalvador',
    maxPosts: process.env.INSTAGRAM_MAX_POSTS ? parseInt(process.env.INSTAGRAM_MAX_POSTS) : 20,
    includeStories: false, // Stories serão processados separadamente via Instagram Vision
    apifyToken: process.env.APIFY_TOKEN || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  }

  if (!config.apifyToken) {
    throw new Error('APIFY_TOKEN is required for Instagram Apify scraper')
  }

  const scraper = new InstagramApifyScraper(config)

  // Testar conexão antes de começar
  const connected = await scraper.testConnection()
  if (!connected) {
    throw new Error('Failed to connect to Apify')
  }

  // Verificar créditos
  const credits = await scraper.checkCredits()
  console.log(`💰 Available Apify credits: ${credits}`)

  // Executar scrape
  const result = await scraper.scrape()

  // Mirror Instagram CDN images to Supabase Storage (CDN URLs expire and block hotlinking)
  const validWithMirroredImages = await mirrorImagesToStorage(result.valid)

  return {
    items_fetched: result.items_fetched,
    valid: validWithMirroredImages,
    invalid_count: result.invalid_count,
  }
}
