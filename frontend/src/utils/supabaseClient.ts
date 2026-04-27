import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Realtime features may not work.')
}

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co', 
  supabaseKey || 'dummy'
)
