import { createClient } from '@supabase/supabase-js'
import type { Page } from 'playwright'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ssxowzurrtyzmracmusn.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase: ReturnType<typeof createClient> | null = null

if (supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

export async function uploadImageToSupabase(
  imageUrl: string,
  eventId: string,
  page?: Page
): Promise<string | null> {
  if (!supabase) {
    console.log('  ⚠️  Supabase not configured, skipping image upload')
    return imageUrl // Return original URL if Supabase not configured
  }

  try {
    // Check if image already exists in Supabase - skip upload if it does
    const { data: existingFile } = await supabase.storage
      .from('event-images')
      .list('events', { search: `event-${eventId}` })

    if (existingFile && existingFile.length > 0) {
      // Use the actual filename found (preserves real extension: .jpg, .webp, .png, etc.)
      const actualFilepath = `events/${existingFile[0].name}`
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(actualFilepath)
      return urlData.publicUrl
    }

    let buffer: Buffer
    let contentType = 'image/jpeg'

    // Download via fetch with browser-like headers (5s timeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    let fetchResponse: Response | null = null
    try {
      fetchResponse = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://elcabong.com.br/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }

    // If fetch failed and Playwright page available, try via browser context
    if ((!fetchResponse || !fetchResponse.ok) && page) {
      try {
        const playwrightResponse = await page.request.get(imageUrl, { timeout: 5000 })
        if (playwrightResponse.ok()) {
          buffer = await playwrightResponse.body()
          contentType = playwrightResponse.headers()['content-type'] || 'image/jpeg'
        } else {
          return imageUrl
        }
      } catch {
        return imageUrl
      }
    } else if (!fetchResponse || !fetchResponse.ok) {
      return imageUrl
    } else {
      const arrayBuffer = await fetchResponse.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      contentType = fetchResponse.headers.get('content-type') || 'image/jpeg'
    }

    // Generate filename
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const finalFilepath = `events/event-${eventId}.${ext}`

    // Upload to Supabase Storage (upsert: false = nunca re-faz upload)
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(finalFilepath, buffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.log(`  ⚠️  Upload failed: ${uploadError.message}`)
      return imageUrl // Return original URL on failure
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(finalFilepath)

    console.log(`  ✅ Image uploaded to Supabase`)
    return urlData.publicUrl

  } catch (err) {
    console.log(`  ⚠️  Error uploading image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    return imageUrl // Return original URL on error
  }
}
