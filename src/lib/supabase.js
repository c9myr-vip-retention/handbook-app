import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase env missing. Copy .env.example to .env and fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Running in preview mode.')
}

// Only create the client when configured. Creating it with empty values throws
// and would blank the whole app, so preview mode (no .env) gets a null client
// and never touches auth.
export const supabase = (url && key) ? createClient(url, key) : null
