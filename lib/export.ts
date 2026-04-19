import { formatDate } from "@/lib/utils";

export function customerLedgerToCsv(input: {
  customerName: string;
  watermark?: string | null;
  rows: Array<{
    created_at: string;
    description: string | null;
    type: "BAAKI" | "PAYMENT";
    amount: number;
    balance: number;
  }>;
}) {
  const header = ["Date", "Description", "Baaki", "Payment", "Balance"];
  const lines = input.rows.map((row) =>
    [
      formatDate(row.created_at),
      csvEscape(row.description || (row.type === "BAAKI" ? "Goods taken" : "Payment made")),
      row.type === "BAAKI" ? row.amount.toFixed(2) : "",
      row.type === "PAYMENT" ? row.amount.toFixed(2) : "",
      row.balance.toFixed(2)
    ].join(",")
  );

  const prefix = input.watermark ? [`# ${input.watermark}`] : [];
  return [...prefix, header.join(","), ...lines].join("\n");
}

export function customerLedgerToPrintableHtml(input: {
  customerName: string;
  currentBalance: number;
  watermark?: string | null;
  rows: Array<{
    created_at: string;
    description: string | null;
    type: "BAAKI" | "PAYMENT";
    amount: number;
    balance: number;
  }>;
}) {
  const rows = input.rows
    .map(
      (row) => `
        <tr>
          <td>${formatDate(row.created_at)}</td>
          <td>${escapeHtml(row.description || (row.type === "BAAKI" ? "Goods taken" : "Payment made"))}</td>
          <td style="text-align:right">${row.type === "BAAKI" ? row.amount.toFixed(2) : "-"}</td>
          <td style="text-align:right">${row.type === "PAYMENT" ? row.amount.toFixed(2) : "-"}</td>
          <td style="text-align:right">${row.balance.toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.customerName)} ledger</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
      h1 { margin-bottom: 6px; }
      .watermark { margin-top: 0; color: #b45309; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 14px; }
      th { background: #f3f4f6; text-align: left; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(input.customerName)} khata</h1>
    ${input.watermark ? `<p class="watermark">${escapeHtml(input.watermark)}</p>` : ""}
    <p>Current baaki: Rs. ${Math.round(input.currentBalance)}</p>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Baaki</th>
          <th>Payment</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
