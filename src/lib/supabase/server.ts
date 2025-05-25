import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Server-side Supabase client
export const createServerSupabaseClient = () => {
    return createServerComponentClient({ cookies })
} 