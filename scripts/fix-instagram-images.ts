import 'dotenv/config'
import { supabase } from './src/supabase.js'

const BUCKET = 'events'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
}

async function downloadAndUpload(imageUrl: string, eventId: string): Promise<string | null> {
  try {
    // Download
    const response = await fetch(imageUrl, { headers: HEADERS })
    if (!response.ok) {
      console.log(`   ❌ Download failed: ${response.status}`)
      return null
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const filename = `instagram/${eventId}.${ext}`
    
    // Upload (upsert: true overrides existing)
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType, upsert: true })
    
    if (uploadErr) {
      console.log(`   ❌ Upload failed: ${uploadErr.message}`)
      return null
    }
    
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    return urlData.publicUrl
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`   ❌ Error: ${msg}`)
    return null
  }
}

async function main() {
  console.log('========== Fix Instagram images (download + upload to Supabase) ==========\n')
  
  // Get future Instagram events with CDN image URLs
  const now = new Date().toISOString()
  const { data: events } = await supabase
    .from('events')
    .select('id, title, image_url')
    .eq('source', 'instagram')
    .gte('start_datetime', now)
    .like('image_url', '%cdninstagram.com%')
    .order('start_datetime', { ascending: true })
  
  if (!events || events.length === 0) {
    console.log('No Instagram events with CDN URLs to fix!')
    return
  }
  
  console.log(`Found ${events.length} Instagram events with expiring CDN URLs\n`)
  
  // Group by image_url to avoid duplicate uploads (same image used by multiple events)
  const uniqueImages = new Map<string, { newUrl: string | null; eventIds: string[] }>()
  for (const ev of events) {
    if (!ev.image_url) continue
    if (!uniqueImages.has(ev.image_url)) {
      uniqueImages.set(ev.image_url, { newUrl: null, eventIds: [] })
    }
    uniqueImages.get(ev.image_url)!.eventIds.push(ev.id)
  }
  
  console.log(`Unique images to download: ${uniqueImages.size}\n`)
  
  // Download + upload each unique image
  let i = 0
  for (const [imageUrl, info] of uniqueImages.entries()) {
    i++
    console.log(`[${i}/${uniqueImages.size}] ${info.eventIds.length} events share this image`)
    
    // Use first event ID as filename
    const newUrl = await downloadAndUpload(imageUrl, info.eventIds[0])
    info.newUrl = newUrl
    
    if (newUrl) {
      console.log(`   ✅ ${newUrl}`)
    }
  }
  
  // Update all events
  console.log(`\n========== Updating events in DB ==========\n`)
  let updated = 0
  let failed = 0
  
  for (const [, info] of uniqueImages.entries()) {
    if (!info.newUrl) {
      failed += info.eventIds.length
      continue
    }
    
    const { error } = await supabase
      .from('events')
      .update({ image_url: info.newUrl })
      .in('id', info.eventIds)
    
    if (error) {
      console.log(`❌ Update failed for ${info.eventIds.length} events: ${error.message}`)
      failed += info.eventIds.length
    } else {
      updated += info.eventIds.length
    }
  }
  
  console.log(`\n========== Summary ==========`)
  console.log(`✅ Updated: ${updated}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Total: ${events.length}`)
}

main().catch(console.error)
