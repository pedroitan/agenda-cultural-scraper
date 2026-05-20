import 'dotenv/config'
import { supabase } from './src/supabase.js'

async function main() {
  console.log('Adding city column to tours table...')
  
  // Check if column exists
  const { data: tours, error } = await supabase.from('tours').select('*').limit(1)
  
  if (error) {
    console.log('Error reading tours:', error.message)
    return
  }
  
  if (tours && tours.length > 0 && 'city' in tours[0]) {
    console.log('✅ city column already exists')
    return
  }
  
  console.log('city column does NOT exist. Need manual ALTER TABLE.')
  console.log('\nRun this SQL in Supabase SQL Editor:\n')
  console.log('ALTER TABLE tours ADD COLUMN IF NOT EXISTS city TEXT DEFAULT \'salvador\';')
  console.log('CREATE INDEX IF NOT EXISTS idx_tours_city ON tours(city);')
}

main().catch(console.error)
