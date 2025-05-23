"use client";
// pages/index.tsx
import React, { useEffect, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";
import FileDrop from "@/components/FileDrop";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    async function fetchSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error.message);
        setToken(null);
        setSession(null);
        return;
      }
      setSession(data.session);
      setToken(data.session?.access_token ?? null);
      console.log("Supabase token:", data.session?.access_token);
    }
    fetchSession();

    // Optional: listen to auth state changes and update token/session
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setToken(session?.access_token ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div>
      <h1>Hello World</h1>
      <p>Token: {token ?? "No token found"}</p>
      <FileDrop />
    </div>
  );
}
