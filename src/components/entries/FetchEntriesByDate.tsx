"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { exportToExcel } from "@/utils/exportToExcel";
import { exportToPdf } from "@/utils/exportToPdf";

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

export default function FetchEntriesByDate() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

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

  const fetchEntries = async () => {
    if (!accessToken) {
      setError("No authentication token available");
      return;
    }

    if (!startDate) {
      setError("Please select a start date");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/user/fetch-user-entries-between-dates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            start_date: startDate,
            end_date: endDate || undefined, // Only include if provided
          }),
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
        <div className="overflow-x-auto">
          {/*  */}
          <button
            className="bg-green-500 font-bold text-white p-2 rounded-md"
            onClick={() => exportToExcel(entries, "users.xlsx")}
          >
            Download Excel
          </button>
          <button
            className="bg-green-500 font-bold text-white p-2 rounded-md"
            onClick={() => exportToPdf(entries, "users.pdf")}
          >
            Download PDF
          </button>
          {/*  */}
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
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p>No entries found for the selected date range.</p>
        </div>
      )}
    </div>
  );
}
