import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

export const exportToPdf = async <T extends Record<string, any>>(data: T[], filename = 'data.pdf') => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  const fontSize = 12;
  let y = height - 40;

  // Generate table headers
  const headers = Object.keys(data[0]);
  const columnGap = 100;

  headers.forEach((header, index) => {
    page.drawText(header, {
      x: 50 + index * columnGap,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  });

  y -= 20;

  // Fill table rows
  data.forEach(row => {
    headers.forEach((header, index) => {
      const text = String(row[header]);
      page.drawText(text, {
        x: 50 + index * columnGap,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    });
    y -= 20;
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  saveAs(blob, filename);
};
