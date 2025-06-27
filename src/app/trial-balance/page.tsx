"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface TrialBalanceAccount {
  account_name: string;
  balance_amount: number;
  last_updated_at: string;
}

interface TrialBalance {
  debit: TrialBalanceAccount[];
  credit: TrialBalanceAccount[];
  total_debit: number;
  total_credit: number;
}

export default function TrialBalancePage() {
  const [trialBalance, setTrialBalance] = useState<TrialBalance>({
    debit: [],
    credit: [],
    total_debit: 0,
    total_credit: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSelectedDate, setCurrentSelectedDate] = useState<string | null>(
    null
  );
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [isGeneratingFinalAccounts, setIsGeneratingFinalAccounts] =
    useState(false);
  const supabase = createClientComponentClient();

  const generateFinalAccounts = async () => {
    try {
      setIsGeneratingFinalAccounts(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("No active session found");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/api/generate-final-accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            trialBalance,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result);

      if (result.success) {
        // Handle successful generation - you might want to redirect or show a success message
        alert("Final accounts generated successfully!");
      } else {
        throw new Error(result.error || "Failed to generate final accounts");
      }
    } catch (err) {
      console.error("Error generating final accounts:", err);
      setError("Failed to generate final accounts");
    } finally {
      setIsGeneratingFinalAccounts(false);
    }
  };

  useEffect(() => {
    const fetchTrialBalance = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("No active session found");
          setIsLoading(false);
          return;
        }
        let calculatedDebitAccounts: TrialBalanceAccount[] = [];
        let calculatedCreditAccounts: TrialBalanceAccount[] = [];
        let calculatedTotalDebit = 0;
        let calculatedTotalCredit = 0;
        if (appliedDate) {
          // Get all ledgers for the user
          const { data: ledgers, error: ledgersError } = await supabase
            .from("ledgers")
            .select("id, account_name")
            .eq("user_id", session.user.id);
          if (ledgersError) throw ledgersError;
          const accountBalances: { [key: string]: number } = {};
          for (const ledger of ledgers || []) {
            const { data: entries, error: entriesError } = await supabase
              .from("ledger_entry")
              .select("transaction_type, amount, entry_date")
              .eq("user_id", session.user.id)
              .eq("account_name", ledger.account_name)
              .lte("entry_date", appliedDate);
            if (entriesError) throw entriesError;
            let netBalance = 0;
            entries?.forEach((entry) => {
              if (entry.transaction_type === "debit") {
                netBalance += entry.amount;
              } else {
                netBalance -= entry.amount;
              }
            });
            accountBalances[ledger.account_name] = netBalance;
          }
          Object.keys(accountBalances).forEach((account_name) => {
            const balance = accountBalances[account_name];
            const account: TrialBalanceAccount = {
              account_name,
              balance_amount: Math.abs(balance),
              last_updated_at: new Date().toISOString(),
            };
            if (balance >= 0) {
              calculatedDebitAccounts.push(account);
              calculatedTotalDebit += balance;
            } else {
              calculatedCreditAccounts.push(account);
              calculatedTotalCredit += Math.abs(balance);
            }
          });
        } else {
          // No date filter: use ledgers table
          const { data: ledgers, error: ledgersError } = await supabase
            .from("ledgers")
            .select("account_name, net_amount, last_updated_at")
            .eq("user_id", session.user.id);
          if (ledgersError) throw ledgersError;
          ledgers?.forEach((ledger) => {
            const account: TrialBalanceAccount = {
              account_name: ledger.account_name,
              balance_amount: Math.abs(ledger.net_amount),
              last_updated_at: ledger.last_updated_at,
            };
            if (ledger.net_amount >= 0) {
              calculatedDebitAccounts.push(account);
              calculatedTotalDebit += ledger.net_amount;
            } else {
              calculatedCreditAccounts.push(account);
              calculatedTotalCredit += Math.abs(ledger.net_amount);
            }
          });
        }
        calculatedDebitAccounts.sort((a, b) =>
          a.account_name.localeCompare(b.account_name)
        );
        calculatedCreditAccounts.sort((a, b) =>
          a.account_name.localeCompare(b.account_name)
        );
        setTrialBalance({
          debit: calculatedDebitAccounts,
          credit: calculatedCreditAccounts,
          total_debit: calculatedTotalDebit,
          total_credit: calculatedTotalCredit,
        });
      } catch (err) {
        setError("Failed to fetch trial balance");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrialBalance();
  }, [supabase, appliedDate]);

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
      <h1 className="text-3xl font-bold mb-8">Trial Balance</h1>

      <div className="mb-6 flex items-end">
        <div className="mr-4">
          <label
            htmlFor="selectDate"
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Trial Balance as of:
          </label>
          <input
            type="date"
            id="selectDate"
            value={currentSelectedDate || ""}
            onChange={(e) => setCurrentSelectedDate(e.target.value)}
            className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <button
          onClick={() => setAppliedDate(currentSelectedDate)}
          disabled={!currentSelectedDate}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:shadow-outline"
        >
          Apply Date
        </button>
        {appliedDate && (
          <button
            onClick={() => {
              setCurrentSelectedDate(null);
              setAppliedDate(null);
            }}
            className="ml-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:shadow-outline"
          >
            Clear Date
          </button>
        )}
      </div>

      {trialBalance.debit.length === 0 && trialBalance.credit.length === 0 ? (
        <p className="text-gray-500">No accounts found.</p>
      ) : (
        <>
          <div className="mb-6">
            <button
              onClick={generateFinalAccounts}
              disabled={isGeneratingFinalAccounts}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isGeneratingFinalAccounts ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Generating...
                </span>
              ) : (
                "Generate Final Accounts"
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Particulars</th>
                  <th className="py-3 px-6 text-right">Debit (Rs.)</th>
                  <th className="py-3 px-6 text-right">Credit (Rs.)</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {[...trialBalance.debit, ...trialBalance.credit]
                  .sort((a, b) => a.account_name.localeCompare(b.account_name))
                  .map((account) => (
                    <tr
                      key={account.account_name}
                      className="border-b border-gray-200 hover:bg-gray-100"
                    >
                      <td className="py-3 px-6 text-left whitespace-nowrap">
                        {account.account_name}
                      </td>
                      <td className="py-3 px-6 text-right">
                        {trialBalance.debit.some(
                          (d) => d.account_name === account.account_name
                        )
                          ? account.balance_amount.toLocaleString("en-US", {
                              style: "currency",
                              currency: "INR",
                            })
                          : ""}
                      </td>
                      <td className="py-3 px-6 text-right">
                        {trialBalance.credit.some(
                          (c) => c.account_name === account.account_name
                        )
                          ? account.balance_amount.toLocaleString("en-US", {
                              style: "currency",
                              currency: "INR",
                            })
                          : ""}
                      </td>
                    </tr>
                  ))}
                <tr className="bg-gray-200 text-gray-700 uppercase text-sm leading-normal font-bold">
                  <td className="py-3 px-6 text-left">Total</td>
                  <td className="py-3 px-6 text-right">
                    {trialBalance.total_debit.toLocaleString("en-US", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </td>
                  <td className="py-3 px-6 text-right">
                    {trialBalance.total_credit.toLocaleString("en-US", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
