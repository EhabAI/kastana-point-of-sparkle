import { format } from "date-fns";
import { DateRange } from "../../DateRangeFilter";

// CSV Export utility
export function exportToCSV(data: Record<string, unknown>[], filename: string, headers?: string[]) {
  if (!data.length) return;

  const keys = headers || Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(keys.join(","));

  // Data rows
  data.forEach((row) => {
    const values = keys.map((key) => {
      const value = row[key];
      // Handle commas and quotes in values
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? "";
    });
    csvRows.push(values.join(","));
  });

  const csvContent = csvRows.join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Print utility - opens print dialog with formatted content
export function printReport(
  title: string,
  restaurantName: string,
  dateRange: DateRange,
  contentId: string,
  currencySymbol: string
) {
  const printContent = document.getElementById(contentId);
  if (!printContent) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const dateRangeText = `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ${restaurantName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 24px;
          color: #1a1a1a;
          font-size: 12px;
          line-height: 1.5;
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e5e5;
        }
        .header h1 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .header .restaurant {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        .header .date-range {
          font-size: 12px;
          color: #888;
        }
        .content {
          margin-top: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        th, td {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid #e5e5e5;
        }
        th {
          background: #f5f5f5;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin: 16px 0 8px;
          padding-bottom: 4px;
          border-bottom: 1px solid #e5e5e5;
        }
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .metric-box {
          padding: 12px;
          background: #f9f9f9;
          border-radius: 4px;
        }
        .metric-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-value {
          font-size: 18px;
          font-weight: 700;
          margin-top: 4px;
        }
        .text-right {
          text-align: right !important;
        }
        .text-muted {
          color: #666;
        }
        .text-destructive {
          color: #dc2626;
        }
        .text-success {
          color: #16a34a;
        }
        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
          text-align: center;
          font-size: 10px;
          color: #999;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <div class="restaurant">${restaurantName}</div>
        <div class="date-range">${dateRangeText}</div>
      </div>
      <div class="content">
        ${printContent.innerHTML}
      </div>
      <div class="footer">
        Generated on ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")}
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// Format currency value
export function formatCurrency(value: number, currencySymbol: string): string {
  return `${value.toFixed(3)} ${currencySymbol}`;
}

// Pagination helper
export interface PaginationState {
  page: number;
  pageSize: number;
}

export function getPaginatedData<T>(data: T[], pagination: PaginationState): T[] {
  const start = (pagination.page - 1) * pagination.pageSize;
  const end = start + pagination.pageSize;
  return data.slice(start, end);
}

export function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}
