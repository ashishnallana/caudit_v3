"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Document {
  id: string;
  file_url: string;
  extracted_data: any;
}

interface JournalEntry {
  id: string;
  entry_date: string;
  account_debited: string;
  account_credited: string;
  amount: number;
  description?: string;
  ledger_entries?: LedgerEntry[];
}

interface LedgerEntry {
  id: string;
  account_name: string;
  entry_date: string;
  transaction_type: "debit" | "credit";
  amount: number;
  description?: string;
  created_at: string;
}

interface DocumentJob {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  documents?: Document;
  journal_entries?: JournalEntry;
}

export default function JobDetailsPage() {
  const [job, setJob] = useState<DocumentJob | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("document_jobs")
          .select(
            `
            *,
            documents:document_id (
              id,
              file_url,
              extracted_data
            ),
            journal_entries:journal_entry_id (
              id,
              entry_date,
              account_debited,
              account_credited,
              amount,
              description,
              ledger_entries (
                id,
                account_name,
                entry_date,
                transaction_type,
                amount,
                description,
                created_at
              )
            )
          `
          )
          .eq("id", params.jobId)
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching job details:", error);
          return;
        }

        setJob(data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [params.jobId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <Link
            href="/entries"
            className="text-blue-500 hover:text-blue-700 underline"
          >
            Back to Entries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/entries"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          ← Back to Entries
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Job Details</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              job.status === "parsed"
                ? "bg-green-100 text-green-800"
                : job.status === "in_progress"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {job.status}
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Job Information</h2>
            <p>Job ID: {job.id}</p>
            <p>Created: {new Date(job.created_at).toLocaleString()}</p>
          </div>

          {job.documents && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Document Details</h2>
              <p className="mb-2">
                File URL:{" "}
                <a
                  href={job.documents.file_url}
                  className="text-blue-500 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {job.documents.file_url}
                </a>
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Extracted Data:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(job.documents.extracted_data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {job.journal_entries && (
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Journal Entry Details
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <strong>Date:</strong> {job.journal_entries.entry_date}
                </p>
                <p>
                  <strong>Account Debited:</strong>{" "}
                  {job.journal_entries.account_debited}
                </p>
                <p>
                  <strong>Account Credited:</strong>{" "}
                  {job.journal_entries.account_credited}
                </p>
                <p>
                  <strong>Amount:</strong> {job.journal_entries.amount}
                </p>
                {job.journal_entries.description && (
                  <p>
                    <strong>Description:</strong>{" "}
                    {job.journal_entries.description}
                  </p>
                )}

                {job.journal_entries.ledger_entries &&
                  job.journal_entries.ledger_entries.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">
                        Involved Ledger Books:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {job.journal_entries.ledger_entries.map((entry) => (
                          <button
                            key={entry.id}
                            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                          >
                            {entry.account_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
