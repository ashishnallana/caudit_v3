"use client";

import React from "react";

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
                {entry.entry_date}
              </td>
              <td className="border border-black align-top px-2 py-1">
                <div>
                  <span>
                    {entry.account_debited} A/c A/c
                    <span className="inline-block w-24 border-b border-dotted border-black mx-2 align-middle"></span>
                    Dr.
                  </span>
                  <br />
                  <span className="pl-8 block">
                    To {entry.account_credited} A/c A/c
                  </span>
                  {entry.description && (
                    <span className="block text-xs pl-4 text-gray-700">
                      ({entry.description})
                    </span>
                  )}
                </div>
              </td>
              <td className="border border-black align-top px-2 py-1"></td>
              <td className="border border-black align-top px-2 py-1">
                {entry.amount}
              </td>
              <td className="border border-black align-top px-2 py-1">
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
