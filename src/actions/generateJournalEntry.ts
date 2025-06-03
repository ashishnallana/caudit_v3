// app/journal-pdf/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generate Journal Entry PDF",
};

const generateLatex = (entries: any[]) => {
  const rows = entries
    .map(
      (entry, index) => 
`${entry.entry_date} & ${entry.account_debited} A/c \dotfill Dr. & & ${entry.amount} & \\
& \quad To ${entry.account_credited} A/c & & & ${entry.amount} \\
& (${entry.description}) & & & \\
\hline`
    )
    .join("\n");

  return `
\\documentclass{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{array}
\\usepackage{booktabs}

\\begin{document}

\\begin{center}
    \\textbf{In the journal of M/s M}
\\end{center}

\\begin{tabular}{|p{2cm}|p{7cm}|p{1cm}|p{2cm}|p{2cm}|}
\\hline
\\textbf{Date} & \\textbf{Particulars} & \\textbf{L.F.} & \\textbf{Debit (\₹)} & \\textbf{Credit (\₹)} \\
\\hline
${rows}
\\end{tabular}

\\end{document}

  `;
};

export default async function JournalPdfPage(entries: any[]) {
  // You would get this from a database or user input in a real app
//   const journalEntries = [
//     {
//       entry_date: "10/04/2018",
//       account_debited: "Cash",
//       account_credited: "Sales",
//       amount: 1500,
//       description: "Sale of goods for cash",
//     },
//     {
//       entry_date: "10/04/2018",
//       account_debited: "Office Supplies",
//       account_credited: "Accounts Payable",
//       amount: 2000,
//       description: "Office supplies purchased on credit",
//     },
//   ];

  const latexCode = generateLatex(entries);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL}/latex/convert`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latex_code: latexCode,
      }),
    }
  );

  const data = await response.json();
  console.log(data);
  

  return data.pdf_url;
}
