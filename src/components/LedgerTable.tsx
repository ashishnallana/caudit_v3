import React from "react";

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

interface LedgerTableProps {
  ledgerEntries: LedgerEntry[];
  ledgerBalance: LedgerBalance | null;
}

const LedgerTable: React.FC<LedgerTableProps> = ({
  ledgerEntries,
  ledgerBalance,
}) => {
  const drEntries = ledgerEntries.filter((e) => e.transaction_type === "debit");
  const crEntries = ledgerEntries.filter(
    (e) => e.transaction_type === "credit"
  );
  const maxRows = Math.max(drEntries.length, crEntries.length);
  const drTotal = drEntries.reduce((sum, e) => sum + e.amount, 0);
  const crTotal = crEntries.reduce((sum, e) => sum + e.amount, 0);

  if (ledgerEntries.length === 0) {
    return <p className="text-gray-500">No transactions found.</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          <tr>
            <th
              colSpan={4}
              className="border px-2 py-1 text-center font-semibold"
            >
              Dr.
            </th>
            <th
              colSpan={4}
              className="border px-2 py-1 text-center font-semibold"
            >
              Cr.
            </th>
          </tr>
          <tr>
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Particulars</th>
            <th className="border px-2 py-1">JF No</th>
            <th className="border px-2 py-1">Amount (Rs.)</th>
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Particulars</th>
            <th className="border px-2 py-1">JF No</th>
            <th className="border px-2 py-1">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows }).map((_, i) => {
            const dr = drEntries[i];
            const cr = crEntries[i];
            return (
              <tr key={i}>
                {/* Dr. Side */}
                <td className="border px-2 py-1">
                  {dr ? new Date(dr.entry_date).toLocaleDateString() : ""}
                </td>
                <td className="border px-2 py-1">{dr ? dr.description : ""}</td>
                <td className="border px-2 py-1"></td>
                <td className="border px-2 py-1 text-right">
                  {dr ? dr.amount.toLocaleString("en-IN") : ""}
                </td>
                {/* Cr. Side */}
                <td className="border px-2 py-1">
                  {cr ? new Date(cr.entry_date).toLocaleDateString() : ""}
                </td>
                <td className="border px-2 py-1">
                  {cr
                    ? cr.description.startsWith("By ")
                      ? cr.description
                      : `By ${ledgerBalance?.account_name || "Cash A/c"}`
                    : ""}
                </td>
                <td className="border px-2 py-1"></td>
                <td className="border px-2 py-1 text-right">
                  {cr ? cr.amount.toLocaleString("en-IN") : ""}
                </td>
              </tr>
            );
          })}
          {/* Totals row */}
          <tr className="bg-gray-50 font-semibold" key="totals">
            <td colSpan={3} className="border px-2 py-1 text-right">
              Total
            </td>
            <td className="border px-2 py-1 text-right">
              {drTotal.toLocaleString("en-IN")}
            </td>
            <td colSpan={3} className="border px-2 py-1 text-right">
              Total
            </td>
            <td className="border px-2 py-1 text-right">
              {crTotal.toLocaleString("en-IN")}
            </td>
          </tr>
          {/* Balance rows */}
          <tr key="balance">
            <td className="border px-2 py-1">
              {ledgerEntries.length > 0 ? new Date().toLocaleDateString() : ""}
            </td>
            <td className="border px-2 py-1">To Balance b/d</td>
            <td className="border px-2 py-1"></td>
            <td className="border px-2 py-1 text-right">
              {ledgerBalance && ledgerBalance.balance_amount > 0
                ? ledgerBalance.balance_amount.toLocaleString("en-IN")
                : ""}
            </td>
            <td className="border px-2 py-1">
              {ledgerEntries.length > 0 ? new Date().toLocaleDateString() : ""}
            </td>
            <td className="border px-2 py-1">By Balance c/d</td>
            <td className="border px-2 py-1"></td>
            <td className="border px-2 py-1 text-right">
              {ledgerBalance && ledgerBalance.balance_amount < 0
                ? Math.abs(ledgerBalance.balance_amount).toLocaleString("en-IN")
                : ledgerBalance && ledgerBalance.balance_amount > 0
                ? ledgerBalance.balance_amount.toLocaleString("en-IN")
                : ""}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default LedgerTable;
