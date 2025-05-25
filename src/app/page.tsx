
"use client";
import FileDrop from "@/components/FileDrop";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function Home() {
  // const {user, loading} = useAuth()

  // console.log(user);

  // const { data, error } = await supabase.auth.getSession();
  // const accessToken = data.session?.access_token ?? null

  // console.log("⭐⭐⭐", accessToken, "👉👉", data.session);
  
  return (
    <div>
      <h1>Hello World</h1>
      <FileDrop />
    </div>
  );
}
