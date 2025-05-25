'use server'

import { inngest } from "@/inngest/client";
import Events from "@/inngest/constants";
import { createClient } from "@supabase/supabase-js";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function uploadPDF(formData: FormData, uid: string) {
    try {
        // Get the session using server-side Supabase client
        const cookieStore = cookies();
        const supabaseServer = createServerComponentClient({ cookies: () => cookieStore });
        const { data: { session } } = await supabaseServer.auth.getSession();

        if (!session?.access_token) {
            return { success: false, error: 'No active session found' }
        }

        const file = formData.get('file') as File
        if (!file) {
            return { success: false, error: 'No file provided' }
        }

        // Generate a unique filename using timestamp and user ID
        const timestamp = Date.now()
        const fileName = `${uid}/${timestamp}-${file.name}`

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        const { data, error } = await supabase
            .storage
            .from('invoices')
            .upload(fileName, uint8Array, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false
            })

        const { data: { publicUrl } } = supabase
            .storage
            .from('invoices')
            .getPublicUrl(fileName)

        if (error) {
            console.error('Supabase upload error:', error)
            return { success: false, error: error.message }
        }

        // agent call
        const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/process-document`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ "document_url": publicUrl }),
        });

        const processingResponse = await response.json();
        console.log(processingResponse);

        return {
            success: true,
            data: {
                path: data.path,
                fileName: file.name
            }
        }
    } catch (error) {
        console.error('Upload error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unknown error occurred'
        }
    }
}