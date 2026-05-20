import 'dotenv/config'
import { supabase } from './src/supabase.js'

async function main() {
  console.log('========== Testing Instagram image download + upload ==========\n')
  
  // 1. List buckets
  console.log('1. Listing storage buckets...')
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
  if (listErr) {
    console.error('❌ Error listing buckets:', listErr)
    return
  }
  console.log(`   Found ${buckets?.length || 0} buckets:`)
  buckets?.forEach(b => console.log(`   - ${b.name} (public: ${b.public})`))
  
  // 2. Get a sample Instagram event with image
  console.log('\n2. Fetching sample Instagram event...')
  const { data: events } = await supabase
    .from('events')
    .select('id, title, image_url, url')
    .eq('source', 'instagram')
    .not('image_url', 'is', null)
    .limit(1)
  
  if (!events || events.length === 0) {
    console.log('No Instagram events found')
    return
  }
  
  const ev = events[0]
  console.log(`   Event: ${ev.title}`)
  console.log(`   Image URL: ${ev.image_url?.substring(0, 100)}...`)
  
  // 3. Download image
  console.log('\n3. Downloading image from Instagram CDN...')
  const startDownload = Date.now()
  const response = await fetch(ev.image_url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    }
  })
  
  if (!response.ok) {
    console.error(`❌ Download failed: ${response.status}`)
    return
  }
  
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  console.log(`   ✅ Downloaded ${buffer.length} bytes (${contentType}) in ${Date.now() - startDownload}ms`)
  
  // 4. Try upload to event-images bucket
  console.log('\n4. Uploading to Supabase Storage...')
  const filename = `events/test-instagram-${ev.id}.jpg`
  
  // Try existing buckets
  const bucketName = buckets?.[0]?.name || 'event-images'
  console.log(`   Using bucket: ${bucketName}`)
  
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from(bucketName)
    .upload(filename, buffer, { contentType, upsert: true })
  
  if (uploadErr) {
    console.error(`❌ Upload failed: ${uploadErr.message}`)
    return
  }
  
  console.log(`   ✅ Uploaded: ${uploadData?.path}`)
  
  // 5. Get public URL
  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filename)
  console.log(`\n5. Public URL: ${urlData.publicUrl}`)
  
  // 6. Test public URL is accessible
  console.log('\n6. Testing public URL accessibility...')
  const testResp = await fetch(urlData.publicUrl, { method: 'HEAD' })
  console.log(`   Status: ${testResp.status} ${testResp.ok ? '✅' : '❌'}`)
}

main().catch(console.error)
