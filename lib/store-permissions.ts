export type StorePermission =
  | "manage_customers"
  | "manage_ledger"
  | "send_sms_reminders"
  | "share_customer_ledger"
  | "export_customer_ledger";

export const STORE_PERMISSION_OPTIONS: Array<{
  key: StorePermission;
  label: string;
  description: string;
}> = [
  {
    key: "manage_customers",
    label: "Customers",
    description: "Add, edit, and remove customer profiles.",
  },
  {
    key: "manage_ledger",
    label: "Ledger",
    description: "Create and delete baaki and payment entries.",
  },
  {
    key: "send_sms_reminders",
    label: "SMS reminders",
    description: "Send payment reminders when the plan allows SMS.",
  },
  {
    key: "share_customer_ledger",
    label: "Share links",
    description: "Create customer share text and read-only links.",
  },
  {
    key: "export_customer_ledger",
    label: "Exports",
    description: "Download or print customer ledgers.",
  },
];

export const DEFAULT_STAFF_PERMISSIONS: StorePermission[] = STORE_PERMISSION_OPTIONS.map(
  (permission) => permission.key,
);

const VALID_PERMISSION_SET = new Set<StorePermission>(DEFAULT_STAFF_PERMISSIONS);

export function normalizeStorePermissions(value: unknown): StorePermission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (permission): permission is StorePermission =>
          typeof permission === "string" &&
          VALID_PERMISSION_SET.has(permission as StorePermission),
      ),
    ),
  );
}

export function hasStorePermission(
  role: "OWNER" | "STAFF",
  permissions: StorePermission[],
  requiredPermission: StorePermission,
) {
  if (role === "OWNER") {
    return true;
  }

  return permissions.includes(requiredPermission);
}
