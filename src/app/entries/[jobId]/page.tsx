"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Job {
  id: string;
  user_id: string;
  status: string;
  error_message?: string;
  attempt_count: number;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
  file_url: string;
  journal_entry_id?: string;
  journal_entry?: {
    id: string;
    entry_date: string;
    debit_account: string;
    credit_account: string;
    amount: number;
    description: string;
    reference_no: string;
  };
}

export default function JobDetailsPage() {
  const [job, setJob] = useState<Job | null>(null);
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
          .from("job")
          .select(
            `*, journal_entry:journal_entry_id (id, entry_date, debit_account, credit_account, amount, description, reference_no)`
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

          {job.journal_entry && (
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Journal Entry Details
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>
                  <strong>Date:</strong> {job.journal_entry.entry_date}
                </p>
                <p>
                  <strong>Account Debited:</strong>{" "}
                  {job.journal_entry.debit_account}
                </p>
                <p>
                  <strong>Account Credited:</strong>{" "}
                  {job.journal_entry.credit_account}
                </p>
                <p>
                  <strong>Amount:</strong> {job.journal_entry.amount}
                </p>
                {job.journal_entry.description && (
                  <p>
                    <strong>Description:</strong>{" "}
                    {job.journal_entry.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
