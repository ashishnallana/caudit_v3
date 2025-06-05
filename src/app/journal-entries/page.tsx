"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import FetchEntriesByDate from "@/components/journal-entries/FetchEntriesByDate";
import DataTable from "@/components/DataTable";

interface JournalEntry {
  id: string;
  account_credited: string;
  account_debited: string;
  amount: number;
  created_at: string;
  currency: string;
  description: string;
  entry_date: string;
  source_document_url: string;
  source_id: string;
  source_type: string;
  user_id: string;
}

interface Column {
  key: keyof JournalEntry;
  label: string;
  format?: (value: any) => string | number;
}

const columns: Column[] = [
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount" },
  { key: "currency", label: "Currency" },
  { key: "account_debited", label: "Account Debited" },
  { key: "account_credited", label: "Account Credited" },
  {
    key: "entry_date",
    label: "Entry Date",
    format: (value: string) => new Date(value).toLocaleDateString(),
  },
  {
    key: "created_at",
    label: "Created At",
    format: (value: string) => new Date(value).toLocaleDateString(),
  },
];

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("No active session found");
          setIsLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("user_id", session.user.id)
          .order("entry_date", { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setEntries(data || []);
      } catch (err) {
        setError("Failed to fetch journal entries");
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Journal Entries</h1>

      {isLoading === false && entries.length === 0 ? (
        <div className="text-center text-gray-500">
          <p>No journal entries found.</p>
        </div>
      ) : (
        <div>
          <FetchEntriesByDate />
          <DataTable data={entries} columns={columns} keyField="id" />
        </div>
      )}
    </div>
  );
}
