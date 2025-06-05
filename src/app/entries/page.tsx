"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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
}

interface DocumentJob {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  documents?: Document;
  journal_entries?: JournalEntry;
}

export default function EntriesPage() {
  const [documentJobs, setDocumentJobs] = useState<DocumentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchDocumentJobs = async () => {
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
              description
            )
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching document jobs:", error);
          return;
        }

        setDocumentJobs(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentJobs();

    // Set up real-time subscription
    const channel = supabase
      .channel("document_jobs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "document_jobs",
        },
        async (payload) => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          if (
            payload.new &&
            "user_id" in payload.new &&
            payload.new.user_id === user.id
          ) {
            setDocumentJobs((currentJobs) => {
              if (payload.eventType === "INSERT") {
                return [payload.new as DocumentJob, ...currentJobs];
              } else if (payload.eventType === "UPDATE") {
                return currentJobs.map((job) =>
                  job.id === payload.new.id ? (payload.new as DocumentJob) : job
                );
              } else if (payload.eventType === "DELETE") {
                return currentJobs.filter((job) => job.id !== payload.old.id);
              }
              return currentJobs;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Document Jobs</h1>
      {documentJobs.length === 0 ? (
        <p className="text-gray-500">No document jobs found.</p>
      ) : (
        <div className="grid gap-4">
          {documentJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Job ID: {job.id}</p>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(job.created_at).toLocaleString()}
                  </p>
                </div>
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

              {job.status === "parsed" && (
                <div className="mt-4 text-sm text-gray-700 space-y-2">
                  {job.documents && (
                    <div>
                      <p className="font-semibold">Document:</p>
                      <p>
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
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(job.documents.extracted_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {job.journal_entries && (
                    <div>
                      <p className="font-semibold mt-2">Journal Entry:</p>
                      <p>Date: {job.journal_entries.entry_date}</p>
                      <p>Debit: {job.journal_entries.account_debited}</p>
                      <p>Credit: {job.journal_entries.account_credited}</p>
                      <p>Amount: {job.journal_entries.amount}</p>
                      {job.journal_entries.description && (
                        <p>Description: {job.journal_entries.description}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
