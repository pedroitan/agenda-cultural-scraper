import { supabase } from './src/supabase.js'

async function main() {
  console.log('========== Cleaning El Cabong events without images ==========')

  
  // Delete all El Cabong events without images
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('source', 'elcabong')
    .is('image_url', null)
  
  if (error) {
    console.error('Error deleting events:', error)
  } else {
    console.log('✅ Deleted El Cabong events without images')
  }
  
  // Count remaining El Cabong events
  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'elcabong')
  
  console.log(`📊 Remaining El Cabong events: ${count}`)
  
  // Count El Cabong events with images
  const { count: withImages } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'elcabong')
    .not('image_url', 'is', null)
  
  console.log(`📊 El Cabong events with images: ${withImages}`)
}

main().catch(console.error)
