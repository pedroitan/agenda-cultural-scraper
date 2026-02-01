import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ssxowzurrtyzmracmusn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  console.log('🔧 Creating event-images bucket...\n');

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    process.exit(1);
  }

  const bucketExists = buckets.some(b => b.name === 'event-images');

  if (bucketExists) {
    console.log('✅ Bucket already exists');
    
    // Update to public
    const { error: updateError } = await supabase.storage.updateBucket('event-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (updateError) {
      console.error('❌ Error updating bucket:', updateError);
      process.exit(1);
    }

    console.log('✅ Bucket configured as PUBLIC');
  } else {
    console.log('📦 Creating bucket...');
    
    const { error: createError } = await supabase.storage.createBucket('event-images', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      process.exit(1);
    }

    console.log('✅ Bucket created as PUBLIC');
  }

  console.log('\n✅ Setup complete!');
  console.log(`📁 Bucket: event-images`);
  console.log(`🔗 URL: ${supabaseUrl}/storage/v1/object/public/event-images/`);
}

createBucket();
