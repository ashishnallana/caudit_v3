import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Server-side Supabase client
export const createServerSupabaseClient = async () => {
    const cookieStore = cookies()
    return createServerComponentClient({ cookies: () => cookieStore })
} 