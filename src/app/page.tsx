"use client";
import FileDrop from "@/components/FileDrop";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export default async function Home() {
  // Get the current session
  useEffect(() => {
    const logSessionToken = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      console.log(session?.access_token);
    };
    logSessionToken();
  }, []);

  // console.log(session?.access_token);

  return (
    <div>
      <h1>Hello World</h1>
      <FileDrop />
      <h1>hello world 2</h1>
    </div>
  );
}
