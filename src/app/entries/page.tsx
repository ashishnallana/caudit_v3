"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import FetchEntriesByDate from "@/components/entries/FetchEntriesByDate";
import generateJournalEntry from "@/actions/generateJournalEntry";

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

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getToken = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setAccessToken(session?.access_token || null);
      } catch (err) {
        setError("Failed to get authentication token");
        setIsLoading(false);
      }
    };

    getToken();
  }, [supabase]);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/user/fetch-user-entries`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch entries");
        }

        const res = await response.json();
        setEntries(res.data || []);
      } catch (err) {
        setError("Failed to fetch journal entries");
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [accessToken]);

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
        <div className="overflow-x-auto">
          <FetchEntriesByDate />
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Debited
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Credited
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.map((entry, i) => (
                <tr key={entry.id || i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.account_debited}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.account_credited}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(entry.entry_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
