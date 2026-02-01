import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ssxowzurrtyzmracmusn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('   Set it as environment variable:');
  console.error('   $env:SUPABASE_SERVICE_KEY="your-key"; node scripts/download-images-to-supabase.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadAndUploadImages() {
  console.log('🖼️  Downloading images to Supabase Storage...\n');

  // 1. Get events with external images
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, image_url, source')
    .not('image_url', 'is', null)
    .gte('start_datetime', new Date().toISOString());

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  console.log(`📊 Found ${events?.length || 0} events with images\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of events || []) {
    // Skip if already hosted on Supabase
    if (event.image_url.includes('supabase.co')) {
      skipped++;
      continue;
    }

    try {
      console.log(`📥 Downloading: ${event.title.substring(0, 50)}...`);
      console.log(`   URL: ${event.image_url}`);

      // Download image
      const response = await fetch(event.image_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        console.log(`   ❌ Failed to download (${response.status})`);
        failed++;
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Generate filename
      const ext = contentType.split('/')[1] || 'jpg';
      const filename = `event-${event.id}.${ext}`;
      const filepath = `events/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filepath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.log(`   ❌ Upload failed: ${uploadError.message}`);
        failed++;
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(filepath);

      // Update event with new URL
      const { error: updateError } = await supabase
        .from('events')
        .update({ image_url: urlData.publicUrl })
        .eq('id', event.id);

      if (updateError) {
        console.log(`   ❌ Database update failed: ${updateError.message}`);
        failed++;
        continue;
      }

      console.log(`   ✅ Uploaded and updated`);
      console.log(`   New URL: ${urlData.publicUrl.substring(0, 60)}...`);
      downloaded++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      failed++;
    }

    console.log('');
  }

  console.log('\n📊 Summary:');
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Skipped (already on Supabase): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${events?.length || 0}`);
}

downloadAndUploadImages();
