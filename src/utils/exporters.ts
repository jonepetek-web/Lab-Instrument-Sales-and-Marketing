import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Product, Quotation } from '../types/platform.ts';

export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportToExcel(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[]
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return [];
  const ws = wb.Sheets[firstSheet];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return raw.map((row) => {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      clean[k] = String(v ?? '').trim();
    }
    return clean;
  });
}

export function exportQuotationPDF(quotation: Quotation) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 88, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('HELIOS ANALYTICAL', 40, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('Scientific Laboratory Instruments · Supply, Commissioning & Metrology', 40, 54);
  doc.text('Speicherstrasse 45, 60327 Frankfurt am Main, Germany · quotes@heliosanalytical.com', 40, 68);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COMMERCIAL QUOTATION', pageWidth - 40, 38, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${quotation.quoteNumber}`, pageWidth - 40, 55, { align: 'right' });
  doc.text(`Date: ${quotation.createdAt} · Status: ${quotation.status}`, pageWidth - 40, 70, {
    align: 'right',
  });

  // Customer & Meta Grid
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR', 40, 118);
  doc.text('QUOTATION DETAILS', 320, 118);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(quotation.customerName || 'Valued Laboratory Client', 40, 134);
  doc.text(`Attn: ${quotation.customerContact || 'Procurement Department'}`, 40, 148);
  doc.text(quotation.customerEmail || '', 40, 162);
  doc.text(quotation.customerLocation || '', 40, 176);

  doc.text(`Template: ${quotation.templateType}`, 320, 134);
  doc.text(`Validity: ${quotation.validityDays} Days from Issue`, 320, 148);
  doc.text(`Prepared By: ${quotation.createdBy}`, 320, 162);
  doc.text(`Approved By: ${quotation.approvedBy || 'Pending Sign-off'}`, 320, 176);

  // Items Table
  autoTable(doc, {
    startY: 200,
    head: [['Instrument / Description', 'Model & OEM', 'Qty', 'Unit Price', 'Disc %', 'Line Total']],
    body: quotation.items.map((item) => [
      `${item.productName}\n${item.specsSummary}`,
      `${item.modelNumber}\n${item.manufacturer}`,
      String(item.quantity),
      `$${item.unitPrice.toLocaleString()}`,
      `${item.discountPercent}%`,
      `$${item.lineTotal.toLocaleString()}`,
    ]),
    styles: { fontSize: 8.5, cellPadding: 6, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

  // Totals Block
  const rightColX = pageWidth - 210;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', rightColX, finalY);
  doc.text(`$${quotation.subtotal.toLocaleString()}`, pageWidth - 40, finalY, { align: 'right' });

  doc.text('Discount:', rightColX, finalY + 16);
  doc.text(`-$${quotation.discountAmount.toLocaleString()}`, pageWidth - 40, finalY + 16, { align: 'right' });

  doc.text(`VAT / Tax (${quotation.taxRate}%):`, rightColX, finalY + 32);
  doc.text(`$${quotation.taxAmount.toLocaleString()}`, pageWidth - 40, finalY + 32, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(rightColX, finalY + 42, pageWidth - 40, finalY + 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL VALUE (USD):', rightColX, finalY + 58);
  doc.text(`$${quotation.totalAmount.toLocaleString()}`, pageWidth - 40, finalY + 58, { align: 'right' });

  // Commercial Terms
  const termsY = finalY + 86;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('COMMERCIAL & TECHNICAL TERMS', 40, termsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const termsLines = [
    `Delivery Terms: ${quotation.deliveryTerms}`,
    `Payment Terms: ${quotation.paymentTerms}`,
    `Warranty Coverage: ${quotation.warrantyTerms}`,
    `Installation & Training: ${quotation.installationTraining}`,
    `General Conditions: ${quotation.termsAndConditions}`,
  ];
  let cursorY = termsY + 15;
  for (const line of termsLines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - 80);
    doc.text(wrapped, 40, cursorY);
    cursorY += wrapped.length * 12 + 4;
  }

  doc.save(`${quotation.quoteNumber}_${quotation.customerName.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

export function exportProductDatasheetPDF(product: Product) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 82, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HELIOS ANALYTICAL · INSTRUMENT DATASHEET', 40, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Document Code: ${product.datasheetCode} · Model: ${product.modelNumber} · OEM: ${product.manufacturer}`, 40, 56);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(product.name, 40, 114);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`${product.category} · Brand: ${product.brand}`, 40, 132);

  const descLines = doc.splitTextToSize(product.description, pageWidth - 80);
  doc.setTextColor(30, 41, 59);
  doc.text(descLines, 40, 156);

  const tableStart = 166 + descLines.length * 14;
  autoTable(doc, {
    startY: tableStart,
    head: [['Technical Parameter', 'Verified Specification']],
    body: Object.entries(product.specs),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('APPLICATIONS & KEY FEATURES', 40, afterTable);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const details = [
    `Applications: ${product.applications.join(' · ')}`,
    `Key Features: ${product.features.join(' · ')}`,
    `Warranty: ${product.warranty}`,
    `Delivery Lead Time: ${product.leadTimeDays} Business Days`,
    `Installation Requirements: ${product.installationReqs}`,
    `Maintenance Requirements: ${product.maintenanceReqs}`,
    `Verified Certifications: ${product.regulatoryCerts.join(', ')}`,
  ];
  let y = afterTable + 16;
  for (const d of details) {
    const wrapped = doc.splitTextToSize(d, pageWidth - 80);
    doc.text(wrapped, 40, y);
    y += wrapped.length * 12 + 5;
  }

  doc.save(`${product.modelNumber}_Datasheet.pdf`);
}

export function exportAnalyticsPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 72, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`HELIOS ANALYTICAL · ${title.toUpperCase()}`, 40, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`${subtitle} · Generated ${new Date().toISOString().slice(0, 10)}`, 40, 52);

  autoTable(doc, {
    startY: 92,
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c))),
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
  });

  doc.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
