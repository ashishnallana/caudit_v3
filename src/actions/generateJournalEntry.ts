import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Generate Journal Entry PDF",
};

const generateLatex = (entries: any[]) => {
  const rows = entries
    .map(
      (entry) => 
`${entry.entry_date} & ${entry.account_debited} A/c \\dotfill Dr. & & ${entry.amount} & \\\\
& \\quad To ${entry.account_credited} A/c & & & ${entry.amount} \\\\
& (${entry.description}) & & & \\\\
\\hline`
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
\\textbf{Date} & \\textbf{Particulars} & \\textbf{L.F.} & \\textbf{Debit ()} & \\textbf{Credit ()} \\\\
\\hline
${rows}
\\end{tabular}

\\end{document}
`;
};


export default async function JournalPdfPage(entries: any[]) {
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
