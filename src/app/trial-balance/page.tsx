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
  const supabase = createClientComponentClient();

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

        // Get all ledger balances
        const { data: balances, error: balancesError } = await supabase
          .from("ledger_balances")
          .select("*")
          .eq("user_id", session.user.id);

        if (balancesError) throw balancesError;

        // Separate accounts into debit and credit
        const debitAccounts: TrialBalanceAccount[] = [];
        const creditAccounts: TrialBalanceAccount[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        balances?.forEach((balance) => {
          const account: TrialBalanceAccount = {
            account_name: balance.account_name,
            balance_amount: Math.abs(balance.balance_amount),
            last_updated_at: balance.last_updated_at,
          };

          if (balance.balance_amount >= 0) {
            debitAccounts.push(account);
            totalDebit += balance.balance_amount;
          } else {
            creditAccounts.push(account);
            totalCredit += Math.abs(balance.balance_amount);
          }
        });

        // Sort accounts alphabetically
        debitAccounts.sort((a, b) =>
          a.account_name.localeCompare(b.account_name)
        );
        creditAccounts.sort((a, b) =>
          a.account_name.localeCompare(b.account_name)
        );

        setTrialBalance({
          debit: debitAccounts,
          credit: creditAccounts,
          total_debit: totalDebit,
          total_credit: totalCredit,
        });
      } catch (err) {
        setError("Failed to fetch trial balance");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrialBalance();
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
      <h1 className="text-3xl font-bold mb-8">Trial Balance</h1>

      {trialBalance.debit.length === 0 && trialBalance.credit.length === 0 ? (
        <p className="text-gray-500">No accounts found.</p>
      ) : (
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
              {/* Combine and sort all accounts */}
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
              {/* Total Row */}
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
      )}
    </div>
  );
}
