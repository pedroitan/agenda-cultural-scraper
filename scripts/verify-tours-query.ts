import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Mimic the frontend's anon client (which is what the page uses)
const supabaseUrl = process.env.SUPABASE_URL!
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!

console.log('URL:', supabaseUrl)
console.log('Has anon key:', !!anonKey)
console.log('Has service key:', !!serviceKey)

async function test(label: string, client: any) {
  console.log(`\n========== ${label} ==========`)
  const { data, error } = await client
    .from('tours')
    .select(`
      *,
      tour_stops (
        order_index,
        events ( image_url, title )
      )
    `)
    .eq('is_published', true)
    .eq('city', 'salvador')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.log('❌ Error:', error)
    return
  }
  
  console.log(`Found ${data?.length || 0} tours`)
  data?.forEach((t: any) => {
    console.log(`  • ${t.title} (${t.tour_stops?.length || 0} stops, published=${t.is_published}, city=${t.city})`)
  })
}

async function main() {
  // Test with service role
  if (serviceKey) {
    await test('SERVICE ROLE', createClient(supabaseUrl, serviceKey))
  }
  
  // Test with anon
  if (anonKey) {
    await test('ANON (like frontend)', createClient(supabaseUrl, anonKey))
  } else {
    console.log('\n⚠️ No anon key found in env')
  }
}

main().catch(console.error)
