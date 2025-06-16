"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import LedgerTable from "@/components/LedgerTable";

interface LedgerEntry {
  id: string;
  entry_date: string;
  transaction_type: "debit" | "credit";
  amount: number;
  description: string;
  created_at: string;
}

interface LedgerBalance {
  account_name: string;
  balance_amount: number;
  last_updated_at: string;
}

export default function LedgerDetailsPage() {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerBalance, setLedgerBalance] = useState<LedgerBalance | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { ledger_balance_id } = useParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchLedgerDetails = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("No active session found");
          setIsLoading(false);
          return;
        }

        // Fetch ledger balance details
        const { data: balance, error: balanceError } = await supabase
          .from("ledger_balances")
          .select("*")
          .eq("id", ledger_balance_id)
          .eq("user_id", session.user.id)
          .single();

        if (balanceError) throw balanceError;
        setLedgerBalance(balance);

        // Fetch all ledger entries for this account
        const { data: entries, error: entriesError } = await supabase
          .from("ledger_entries")
          .select("*")
          .eq("ledger_balance_id", ledger_balance_id)
          .eq("user_id", session.user.id)
          .order("entry_date", { ascending: false });

        if (entriesError) throw entriesError;
        setLedgerEntries(entries || []);
      } catch (err) {
        setError("Failed to fetch ledger details");
        setLedgerEntries([]);
        setLedgerBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLedgerDetails();
  }, [supabase, ledger_balance_id]);

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

  if (!ledgerBalance) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-500">
          <p>Ledger account not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {ledgerBalance.account_name}
        </h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600">Current Balance</p>
              <p
                className={`text-2xl font-bold ${
                  ledgerBalance.balance_amount >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {ledgerBalance.balance_amount.toLocaleString("en-US", {
                  style: "currency",
                  currency: "INR",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Last Updated</p>
              <p className="text-sm">
                {new Date(ledgerBalance.last_updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">
        {ledgerBalance.account_name}
      </h1>
      <h2 className="text-2xl font-bold mb-4">Ledger Account</h2>
      <LedgerTable
        ledgerEntries={ledgerEntries}
        ledgerBalance={ledgerBalance}
      />
    </div>
  );
}
