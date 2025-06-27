"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";

interface LedgerAccount {
  id: string;
  user_id: string;
  last_updated_at: string;
  net_amount: number;
  account_name: string;
}

export default function LedgersPage() {
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchLedgerAccounts = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("No active session found");
          setIsLoading(false);
          return;
        }
        // Fetch ledgers directly
        const { data, error: ledgersError } = await supabase
          .from("ledgers")
          .select("*")
          .eq("user_id", session.user.id)
          .order("account_name", { ascending: true });
        if (ledgersError) throw ledgersError;
        setLedgerAccounts(data || []);
      } catch (err) {
        setError("Failed to fetch ledger accounts");
        setLedgerAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLedgerAccounts();
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
      <h1 className="text-3xl font-bold mb-8">Ledger Accounts</h1>

      {ledgerAccounts.length === 0 ? (
        <p className="text-gray-500">No ledger accounts found.</p>
      ) : (
        <div className="grid gap-4">
          {ledgerAccounts.map((account) => (
            <div
              key={account.account_name}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-lg">{account.account_name}</p>
                  <p className="text-sm text-gray-500">
                    Last updated:{" "}
                    {new Date(account.last_updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p
                    className={`text-lg font-semibold ${
                      account.net_amount >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {account.net_amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </p>
                  {account.id && (
                    <Link
                      href={`/ledgers/${account.id}`}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
