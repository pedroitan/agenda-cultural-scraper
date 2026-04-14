import { createClient } from '@supabase/supabase-js'
import type { Page } from 'playwright'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ssxowzurrtyzmracmusn.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase: ReturnType<typeof createClient> | null = null

if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

const DOWNLOAD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://elcabong.com.br/',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
}

async function downloadImage(imageUrl: string, page?: Page): Promise<{ buffer: Buffer; contentType: string } | null> {
  // Try fetch first
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(imageUrl, { headers: DOWNLOAD_HEADERS, signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      return { buffer, contentType }
    }
    console.log(`    fetch: HTTP ${res.status} ${res.statusText}`)
  } catch (err: any) {
    const cause = err?.cause ? ` → cause: ${err.cause?.code || err.cause?.message || err.cause}` : ''
    console.log(`    fetch: ${err instanceof Error ? `${err.name}: ${err.message}${cause}` : String(err)}`)
  }

  // Fallback: try via Playwright browser context
  if (page) {
    try {
      const res = await page.request.get(imageUrl, { timeout: 15000 })
      if (res.ok()) {
        const buffer = await res.body()
        const contentType = res.headers()['content-type'] || 'image/jpeg'
        return { buffer, contentType }
      }
      console.log(`    playwright: HTTP ${res.status()}`)
    } catch (err) {
      console.log(`    playwright: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return null
}

export async function uploadImageBuffer(
  buffer: Buffer,
  contentType: string,
  eventId: string
): Promise<string | null> {
  if (!supabase) return null

  // Check if already exists
  try {
    const { data: existingFile } = await supabase.storage
      .from('event-images')
      .list('events', { search: `event-${eventId}` })
    if (existingFile && existingFile.length > 0) {
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(`events/${existingFile[0].name}`)
      return urlData.publicUrl
    }
  } catch {}

  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const finalFilepath = `events/event-${eventId}.${ext}`

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await supabase.storage
        .from('event-images')
        .upload(finalFilepath, buffer, { contentType, upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(finalFilepath)
        console.log(`  ✅ Image uploaded to Supabase`)
        return urlData.publicUrl
      }
      console.log(`  ⚠️  Upload attempt ${attempt}/3 failed: ${error.message}`)
    } catch (err) {
      console.log(`  ⚠️  Upload attempt ${attempt}/3 threw: ${err instanceof Error ? err.message : err}`)
    }
    await new Promise(r => setTimeout(r, 500 * attempt))
  }

  console.log(`  ❌ Upload failed after 3 attempts: ${finalFilepath}`)
  return null
}

export async function uploadImageToSupabase(
  imageUrl: string,
  eventId: string,
  page?: Page
): Promise<string | null> {
  if (!supabase) {
    console.log('  ⚠️  Supabase not configured, skipping image upload')
    return null
  }

  // Check if image already exists in Supabase
  try {
    const { data: existingFile } = await supabase.storage
      .from('event-images')
      .list('events', { search: `event-${eventId}` })

    if (existingFile && existingFile.length > 0) {
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(`events/${existingFile[0].name}`)
      return urlData.publicUrl
    }
  } catch (err) {
    console.log(`  ⚠️  Storage list failed: ${err instanceof Error ? err.message : err}`)
    // Continue to attempt download+upload anyway
  }

  // Download image (up to 3 attempts)
  let downloaded: { buffer: Buffer; contentType: string } | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    downloaded = await downloadImage(imageUrl, page)
    if (downloaded) break
    console.log(`  ⚠️  Download attempt ${attempt}/3 failed, retrying...`)
    await new Promise(r => setTimeout(r, 500 * attempt))
  }

  if (!downloaded) {
    console.log(`  ❌ Image download failed after 3 attempts: ${imageUrl}`)
    return null
  }

  const { buffer, contentType } = downloaded
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg').replace('webp', 'webp') || 'jpg'
  const finalFilepath = `events/event-${eventId}.${ext}`

  // Upload to Supabase Storage (up to 3 attempts)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await supabase.storage
        .from('event-images')
        .upload(finalFilepath, buffer, { contentType, upsert: true })

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(finalFilepath)
        console.log(`  ✅ Image uploaded to Supabase`)
        return urlData.publicUrl
      }

      console.log(`  ⚠️  Upload attempt ${attempt}/3 failed: ${error.message}`)
    } catch (err) {
      console.log(`  ⚠️  Upload attempt ${attempt}/3 threw: ${err instanceof Error ? err.message : err}`)
    }

    await new Promise(r => setTimeout(r, 500 * attempt))
  }

  console.log(`  ❌ Image upload failed after 3 attempts: ${finalFilepath}`)
  return null
}
