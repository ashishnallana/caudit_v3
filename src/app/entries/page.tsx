"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface DocumentJob {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  // Add other fields as needed
}

export default function EntriesPage() {
  const [documentJobs, setDocumentJobs] = useState<DocumentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Initial fetch of document jobs
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
          .select("*")
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

          // Only update if the change is for the current user
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

    // Cleanup subscription
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
                    job.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : job.status === "processing"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {job.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
