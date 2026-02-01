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
    let buffer: Buffer
    let contentType = 'image/jpeg'

    // If Playwright page is provided, use it to download the image (bypasses CORS)
    if (page) {
      const response = await page.request.get(imageUrl)
      if (!response.ok()) {
        console.log(`  ⚠️  Failed to download image (${response.status()})`)
        return imageUrl
      }
      buffer = await response.body()
      const headers = response.headers()
      contentType = headers['content-type'] || 'image/jpeg'
    } else {
      // Fallback to regular fetch
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      if (!response.ok) {
        console.log(`  ⚠️  Failed to download image (${response.status})`)
        return imageUrl // Return original URL on failure
      }

      const arrayBuffer = await response.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      contentType = response.headers.get('content-type') || 'image/jpeg'
    }

    // Generate filename
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const filename = `event-${eventId}.${ext}`
    const filepath = `events/${filename}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(filepath, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.log(`  ⚠️  Upload failed: ${uploadError.message}`)
      return imageUrl // Return original URL on failure
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('event-images')
      .getPublicUrl(filepath)

    console.log(`  ✅ Image uploaded to Supabase`)
    return urlData.publicUrl

  } catch (err) {
    console.log(`  ⚠️  Error uploading image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    return imageUrl // Return original URL on error
  }
}
