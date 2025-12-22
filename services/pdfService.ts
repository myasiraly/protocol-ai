
import { jsPDF } from "jspdf";
import * as docx from "docx";

export interface ReportData {
  title: string;
  content: string;
  author: string;
  date: string;
}

// PDF Generation
export const generateProtocolPDF = async (data: ReportData) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  doc.setFillColor(26, 26, 26); 
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("PROTOCOL", margin, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("DEEP RESEARCH INTELLIGENCE", margin, 30);
  doc.text(`DATE: ${data.date}`, pageWidth - margin - 40, 30);

  doc.setTextColor(26, 26, 26);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  const splitTitle = doc.splitTextToSize(data.title.toUpperCase(), contentWidth);
  doc.text(splitTitle, margin, 60);
  
  doc.setDrawColor(224, 192, 151); 
  doc.setLineWidth(1);
  doc.line(margin, 75, margin + 40, 75);

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");

  const lines = data.content.split('\n');
  let y = 90;

  lines.forEach((line) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      y += 5;
      return;
    }

    if (trimmed.startsWith('# ')) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(26, 26, 26);
      y += 10;
      doc.text(trimmed.substring(2), margin, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
    } 
    else if (trimmed.startsWith('## ')) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(26, 26, 26);
      y += 8;
      doc.text(trimmed.substring(3), margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
    }
    else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const splitText = doc.splitTextToSize(`• ${trimmed.substring(2)}`, contentWidth - 5);
      doc.text(splitText, margin + 5, y);
      y += (splitText.length * 6);
    }
    else {
      const splitText = doc.splitTextToSize(trimmed, contentWidth);
      doc.text(splitText, margin, y);
      y += (splitText.length * 6);
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`CONFIDENTIAL // FOR INTERNAL USE ONLY`, margin, 287);
    doc.text(`PAGE ${i} OF ${pageCount}`, pageWidth - margin - 20, 287);
  }

  doc.save(`${data.title.replace(/\s+/g, '_').toLowerCase()}_report.pdf`);
};

// Word Doc (Google Doc Simulation)
export const generateProtocolDoc = async (data: ReportData) => {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

  const docFile = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "PROTOCOL",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: data.title.toUpperCase(),
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Date: ${data.date}`, italics: true }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          ...data.content.split("\n").map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith("# ")) {
              return new Paragraph({ text: trimmed.substring(2), heading: HeadingLevel.HEADING_3 });
            }
            if (trimmed.startsWith("## ")) {
              return new Paragraph({ text: trimmed.substring(3), heading: HeadingLevel.HEADING_4 });
            }
            return new Paragraph({ text: trimmed, spacing: { after: 200 } });
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(docFile);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.title.replace(/\s+/g, '_').toLowerCase()}.docx`;
  link.click();
};

// Spreadsheet (Google Sheet Simulation via CSV)
export const generateProtocolSheet = async (data: ReportData) => {
  const lines = data.content.split("\n");
  
  // 1. Try to extract Markdown Tables
  let rows = lines
    .filter(line => line.includes('|'))
    .map(line => line.split('|').map(cell => cell.trim()).filter(cell => cell !== ""))
    .filter(row => row.length > 1);

  // Skip the separator row (e.g., |---|---|)
  rows = rows.filter(row => !row.every(cell => cell.match(/^-+$/)));

  let csvContent = "";
  
  if (rows.length > 0) {
    csvContent = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  } else {
    // 2. Fallback: Try to parse structured lists (e.g., "1. Location: Value" or "Location: Value")
    const listRows = lines
      .map(line => {
        const cleaned = line.replace(/^\d+\.\s+/, '').replace(/^[*•-]\s+/, '');
        if (cleaned.includes(':')) {
           return cleaned.split(':').map(part => part.trim());
        }
        return [cleaned];
      })
      .filter(row => row[0] !== "");
      
    if (listRows.length > 0) {
      csvContent = listRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    } else {
      // 3. Final Fallback: Just dump the text lines
      csvContent = lines.map(line => `"${line.replace(/"/g, '""')}"`).join("\n");
    }
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.title.replace(/\s+/g, '_').toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
