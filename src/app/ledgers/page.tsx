"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface LedgerBalance {
  id: string;
  account_name: string;
  balance_amount: number;
  last_updated_at: string;
}

export default function LedgersPage() {
  const [ledgerBalances, setLedgerBalances] = useState<LedgerBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchLedgerBalances = async () => {
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
          .from("ledger_balances")
          .select("*")
          .eq("user_id", session.user.id)
          .order("account_name", { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        setLedgerBalances(data || []);
      } catch (err) {
        setError("Failed to fetch ledger balances");
        setLedgerBalances([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLedgerBalances();
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

      {ledgerBalances.length === 0 ? (
        <p className="text-gray-500">No ledger accounts found.</p>
      ) : (
        <div className="grid gap-4">
          {ledgerBalances.map((balance) => (
            <div
              key={balance.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-lg">{balance.account_name}</p>
                  <p className="text-sm text-gray-500">
                    Last updated:{" "}
                    {new Date(balance.last_updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-semibold ${
                      balance.balance_amount >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {balance.balance_amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
