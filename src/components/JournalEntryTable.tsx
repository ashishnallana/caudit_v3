"use client";

import React from "react";
import Link from "next/link";

interface JournalEntry {
  id: string;
  user_id: string;
  created_at: string;
  entry_date: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  description: string;
  reference_no: string;
  debit_ledger_id: string;
  credit_ledger_id: string;
}

interface JournalEntryTableProps {
  entries: JournalEntry[];
}

const JournalEntryTable: React.FC<JournalEntryTableProps> = ({ entries }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-black text-sm">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 font-bold">Date</th>
            <th className="border border-black px-2 py-1 font-bold">
              Particulars
            </th>
            <th className="border border-black px-2 py-1 font-bold">L.F.</th>
            <th className="border border-black px-2 py-1 font-bold">
              Debit (₹)
            </th>
            <th className="border border-black px-2 py-1 font-bold">
              Credit (₹)
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="border border-black align-top px-2 py-1 whitespace-nowrap">
                {new Date(entry.entry_date).toLocaleDateString()}
              </td>
              <td className="border border-black align-top px-2 py-1">
                <div>
                  <span>
                    {entry.debit_account} A/c
                    <span className="inline-block w-24 border-b border-dotted border-black mx-2 align-middle"></span>
                    Dr.
                  </span>
                  <br />
                  <span className="pl-8 block">
                    To {entry.credit_account} A/c
                  </span>
                  {entry.description && (
                    <span className="block text-xs pl-4 text-gray-700">
                      ({entry.description})
                    </span>
                  )}
                </div>
              </td>
              <td className="border border-black align-top px-2 py-1 text-center">
                <div>
                  {entry.debit_ledger_id && (
                    <span>
                      <Link
                        href={`/ledgers/${entry.debit_ledger_id}`}
                        className="text-blue-600 underline hover:text-blue-800"
                        title="Open Debit Ledger"
                      >
                        open
                      </Link>
                    </span>
                  )}
                  <br />
                  {entry.credit_ledger_id && (
                    <span className="">
                      <Link
                        href={`/ledgers/${entry.credit_ledger_id}`}
                        className="text-blue-600 underline hover:text-blue-800"
                        title="Open Credit Ledger"
                      >
                        open
                      </Link>
                    </span>
                  )}
                </div>
              </td>
              <td className="border border-black align-top px-2 py-1">
                {entry.amount}
              </td>
              <td className="border border-black align-top px-2 py-1">
                <br />
                {entry.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default JournalEntryTable;
