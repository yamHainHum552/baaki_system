import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { listAdminUsers, requireAdminAccess } from "@/lib/admin";
import { formatLongDate } from "@/lib/utils";

export default async function SuperAdminUsersPage() {
  const admin = await requireAdminAccess(["SUPER_ADMIN", "SUPPORT_ADMIN"]);
  const users = await listAdminUsers(admin.adminClient);

  return (
    <div className="section-spacing">
      <CollapsibleSection title="Admin users" subtitle="Global platform administrators and their linked stores." defaultOpen>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.14em] text-ink/45">
              <tr>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Store links</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="border-t border-line">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{user.full_name ?? user.email ?? "Unknown user"}</p>
                    <p className="mt-1 text-xs text-ink/60">{user.email ?? "No email"}</p>
                  </td>
                  <td className="px-3 py-3">
                    {user.role ? (
                      <AdminStatusBadge label={user.role} tone="khata" />
                    ) : (
                      <span className="text-xs text-ink/50">Not an admin</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <AdminStatusBadge label={user.is_active ? "active" : "inactive"} tone={user.is_active ? "moss" : "red"} />
                  </td>
                  <td className="px-3 py-3 text-ink/70">
                    {user.store_memberships.length
                      ? user.store_memberships.map((store) => `${store.store_name} (${store.role})`).join(", ")
                      : "No linked stores"}
                  </td>
                  <td className="px-3 py-3 text-ink/70">{formatLongDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  );
}
