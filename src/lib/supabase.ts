import { createClient } from '@supabase/supabase-js'
import { supabase as clientSupabase } from './supabase/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Export the client-side Supabase client
export const supabase = clientSupabase

// Legacy client (for backward compatibility)
export const legacySupabase = createClient(supabaseUrl, supabaseAnonKey) 