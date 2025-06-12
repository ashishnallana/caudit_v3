"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import DataTable from "@/components/DataTable";
import { exportToExcel } from "@/utils/exportToExcel";
import { exportToPdf } from "@/utils/exportToPdf";
import generateJournalEntry from "@/actions/generateJournalEntry";
import DateRangeModal from "@/components/DateRangeModal";

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
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        setFilteredEntries(data || []);
      } catch (err) {
        setError("Failed to fetch journal entries");
        setEntries([]);
        setFilteredEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [supabase]);

  const filterEntriesByDate = () => {
    if (!startDate) {
      setError("Please select a start date");
      return;
    }

    const filtered = entries.filter((entry) => {
      const entryDate = new Date(entry.entry_date);
      const start = new Date(startDate);
      const end = new Date(endDate);

      return entryDate >= start && entryDate <= end;
    });

    setFilteredEntries(filtered);
    setIsModalOpen(false);
  };

  const downloadJournalEntry = async () => {
    const pdfUrl = await generateJournalEntry(filteredEntries);
    window.open(pdfUrl, "_blank");
  };

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

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Journal Entries</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Filter by Date Range
            </button>
            <button
              onClick={() => {
                setStartDate("");
                setEndDate(new Date().toISOString().split("T")[0]);
                setFilteredEntries(entries);
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center text-gray-500">
          <p>No journal entries found.</p>
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              className="bg-green-500 font-bold text-white p-2 rounded-md hover:bg-green-600"
              onClick={() =>
                exportToExcel(filteredEntries, "journal_entries.xlsx")
              }
            >
              Download Excel
            </button>
            <button
              className="bg-green-500 font-bold text-white p-2 rounded-md hover:bg-green-600"
              onClick={() =>
                exportToPdf(filteredEntries, "journal_entries.pdf")
              }
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
          <DataTable data={filteredEntries} columns={columns} keyField="id" />
        </div>
      )}

      <DateRangeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={filterEntriesByDate}
      />
    </div>
  );
}
