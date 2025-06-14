"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
}

interface DocumentJob {
  id: string;
  user_id: string;
  status: string;
  error_message?: string;
  created_at: string;
  file_url: string;
  documents?: Document;
  journal_entries?: JournalEntry;
}

export default function EntriesPage() {
  const [documentJobs, setDocumentJobs] = useState<DocumentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<{
    message: string;
    jobId: string;
    fileUrl: string;
  } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const supabase = createClientComponentClient();

  const handleRetry = async () => {
    if (!selectedError) return;

    try {
      setRetrying(true);

      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session found");
      }

      // Update job status to pending
      const { error: updateError } = await supabase
        .from("document_jobs")
        .update({
          status: "pending",
          error_message: null,
          last_run_at: new Date().toISOString(),
        })
        .eq("id", selectedError.jobId);

      if (updateError) throw updateError;

      // Call the processing API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/document/process-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            document_url: selectedError.fileUrl,
            job_id: selectedError.jobId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to retry processing");
      }

      // Close the error modal
      setSelectedError(null);
    } catch (error) {
      console.error("Retry error:", error);
      alert("Failed to retry processing. Please try again later.");
    } finally {
      setRetrying(false);
    }
  };

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
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      job.status === "parsed"
                        ? "bg-green-100 text-green-800"
                        : job.status === "in_progress"
                        ? "bg-blue-100 text-blue-800"
                        : job.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {job.status}
                  </span>
                  {job.status === "parsed" ? (
                    <Link
                      href={`/entries/${job.id}`}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                    >
                      View Details
                    </Link>
                  ) : job.status === "failed" ? (
                    <button
                      onClick={() =>
                        setSelectedError({
                          message:
                            job.error_message || "No error message available",
                          jobId: job.id,
                          fileUrl: job.file_url,
                        })
                      }
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                    >
                      View Error
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-3 py-1 bg-gray-300 text-gray-500 rounded cursor-not-allowed text-sm"
                      title="View details will be available once the job is parsed"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-red-600">
                Error Details
              </h3>
              <button
                onClick={() => setSelectedError(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-800 whitespace-pre-wrap">
                {selectedError.message}
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedError(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {retrying ? "Retrying..." : "Retry Processing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
