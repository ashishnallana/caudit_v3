"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { exportToExcel } from "@/utils/exportToExcel";
import { exportToPdf } from "@/utils/exportToPdf";
import generateJournalEntry from "@/actions/generateJournalEntry";
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

export default function FetchEntriesByDate() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const supabase = createClientComponentClient();

  const fetchEntries = async () => {
    if (!startDate) {
      setError("Please select a start date");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session found");
      }

      let query = supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("entry_date", startDate)
        .order("entry_date", { ascending: false });

      // Add end date filter if provided
      if (endDate) {
        query = query.lte("entry_date", endDate);
      }

      const { data, error: fetchError } = await query;

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

  const downloadJournalEntry = async () => {
    const pdfUrl = await generateJournalEntry(entries);
    window.open(pdfUrl, "_blank");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Filter Entries by Date</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date (Optional)
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <button
            onClick={fetchEntries}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Fetch Entries"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : entries.length > 0 ? (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              className="bg-green-500 font-bold text-white p-2 rounded-md hover:bg-green-600"
              onClick={() => exportToExcel(entries, "journal_entries.xlsx")}
            >
              Download Excel
            </button>
            <button
              className="bg-green-500 font-bold text-white p-2 rounded-md hover:bg-green-600"
              onClick={() => exportToPdf(entries, "journal_entries.pdf")}
            >
              Download PDF
            </button>
            <button
              className="bg-green-500 font-bold text-white p-2 rounded-md hover:bg-green-600"
              onClick={downloadJournalEntry}
            >
              Generate Journal Entry
            </button>
          </div>
          <DataTable data={entries} columns={columns} keyField="id" />
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p>No entries found for the selected date range.</p>
        </div>
      )}
    </div>
  );
}
