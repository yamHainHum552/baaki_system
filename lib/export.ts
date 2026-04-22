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

export function storeBackupToCsv(input: {
  storeName: string;
  customers: Array<{
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    created_at: string;
  }>;
  ledgerEntries: Array<{
    customer_id: string;
    created_at: string;
    description: string | null;
    type: "BAAKI" | "PAYMENT";
    amount: number | string;
  }>;
}) {
  const customerMap = new Map(input.customers.map((customer) => [customer.id, customer]));
  const lines = [
    `# Store backup: ${input.storeName}`,
    "# Customers",
    ["Customer ID", "Name", "Phone", "Address", "Created At"].join(","),
    ...input.customers.map((customer) =>
      [
        csvEscape(customer.id),
        csvEscape(customer.name),
        csvEscape(customer.phone ?? ""),
        csvEscape(customer.address ?? ""),
        csvEscape(formatDate(customer.created_at)),
      ].join(","),
    ),
    "",
    "# Ledger Entries",
    ["Customer ID", "Customer Name", "Date", "Description", "Type", "Amount"].join(","),
    ...input.ledgerEntries.map((entry) =>
      [
        csvEscape(entry.customer_id),
        csvEscape(customerMap.get(entry.customer_id)?.name ?? "Unknown customer"),
        csvEscape(formatDate(entry.created_at)),
        csvEscape(entry.description ?? ""),
        csvEscape(entry.type),
        Number(entry.amount ?? 0).toFixed(2),
      ].join(","),
    ),
  ];

  return lines.join("\n");
}

export function storeBackupToPrintableHtml(input: {
  storeName: string;
  generatedAt: string;
  customers: Array<{
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    created_at: string;
  }>;
  ledgerEntries: Array<{
    customer_id: string;
    created_at: string;
    description: string | null;
    type: "BAAKI" | "PAYMENT";
    amount: number | string;
  }>;
}) {
  const customerMap = new Map(input.customers.map((customer) => [customer.id, customer]));
  const totals = input.ledgerEntries.reduce(
    (summary, entry) => {
      const amount = Number(entry.amount ?? 0);
      if (entry.type === "BAAKI") {
        summary.baaki += amount;
      } else {
        summary.payments += amount;
      }
      return summary;
    },
    { baaki: 0, payments: 0 },
  );
  const customerRows = input.customers
    .map(
      (customer) => `
        <tr>
          <td>${escapeHtml(customer.name)}</td>
          <td>${escapeHtml(customer.phone ?? "-")}</td>
          <td>${escapeHtml(customer.address ?? "-")}</td>
          <td>${formatDate(customer.created_at)}</td>
        </tr>
      `,
    )
    .join("");
  const ledgerRows = input.ledgerEntries
    .map((entry) => {
      const customer = customerMap.get(entry.customer_id);
      return `
        <tr>
          <td>${formatDate(entry.created_at)}</td>
          <td>${escapeHtml(customer?.name ?? "Unknown customer")}</td>
          <td>${escapeHtml(entry.description ?? "")}</td>
          <td>${escapeHtml(entry.type)}</td>
          <td style="text-align:right">${Number(entry.amount ?? 0).toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.storeName)} store backup</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
      h1, h2 { margin-bottom: 6px; }
      .muted { color: #6b7280; }
      .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
      .summary div { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 24px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; }
      th { background: #f3f4f6; text-align: left; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(input.storeName)} backup</h1>
    <p class="muted">Generated ${formatDate(input.generatedAt)}</p>
    <div class="summary">
      <div><strong>${input.customers.length}</strong><br />Customers</div>
      <div><strong>Rs. ${totals.baaki.toFixed(2)}</strong><br />Total baaki added</div>
      <div><strong>Rs. ${totals.payments.toFixed(2)}</strong><br />Total payments</div>
    </div>
    <h2>Customers</h2>
    <table>
      <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>Created</th></tr></thead>
      <tbody>${customerRows}</tbody>
    </table>
    <h2>Ledger entries</h2>
    <table>
      <thead><tr><th>Date</th><th>Customer</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
      <tbody>${ledgerRows}</tbody>
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
