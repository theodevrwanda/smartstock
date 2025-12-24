import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Export data to Excel (.xlsx) format
 */
export const exportToExcel = (
  data: ExportData[],
  columns: ExportColumn[],
  filename: string
): void => {
  const worksheetData = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      obj[col.header] = row[col.key] ?? '';
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  // Auto-size columns
  const colWidths = columns.map(col => ({
    wch: Math.max(col.header.length, col.width || 15)
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export data to PDF format
 */
export const exportToPDF = (
  data: ExportData[],
  columns: ExportColumn[],
  filename: string,
  title?: string
): void => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Add title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  // Prepare table data
  const headers = columns.map(col => col.header);
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      return value !== null && value !== undefined ? String(value) : '';
    })
  );

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 22 : 10,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Export data to CSV format
 */
export const exportToCSV = (
  data: ExportData[],
  columns: ExportColumn[],
  filename: string
): void => {
  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key];
      const stringValue = value !== null && value !== undefined ? String(value) : '';
      // Escape quotes and wrap in quotes if contains comma
      return stringValue.includes(',') || stringValue.includes('"')
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue;
    })
  );

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Format amount for display
 */
export const formatAmount = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return `${amount.toLocaleString('en-US')} RWF`;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-RW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};
