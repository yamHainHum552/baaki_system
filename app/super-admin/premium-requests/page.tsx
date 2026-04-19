import { updatePremiumRequestStatusAction } from "@/app/super-admin/actions";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { SubmitButton } from "@/components/submit-button";
import { listPremiumRequests, requireAdminAccess } from "@/lib/admin";
import { formatLongDate, formatNumber } from "@/lib/utils";

export default async function SuperAdminPremiumRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const admin = await requireAdminAccess();
  const params = await searchParams;
  const requests = await listPremiumRequests(admin.adminClient);

  return (
    <div className="section-spacing">
      <CollapsibleSection title="Premium request queue" subtitle="Upgrade pipeline across all stores." defaultOpen>
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="soft-panel px-4 py-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-ink">{request.store_name}</p>
                    <AdminStatusBadge label={request.status} tone={request.status === "PENDING" ? "amber" : request.status === "ACTIVATED" ? "moss" : request.status === "REJECTED" ? "red" : "slate"} />
                  </div>
                  <p className="mt-1 text-sm text-ink/65">
                    {request.contact_phone ?? request.store_phone ?? "No contact"} • Requested {formatLongDate(request.created_at)}
                  </p>
                  <p className="mt-2 text-sm text-ink/65">
                    Plan: {request.current_plan_type.replaceAll("_", " ")} / {request.current_plan_status}
                  </p>
                  <p className="mt-2 text-sm text-ink/70">
                    Usage: {formatNumber(request.usage?.customer_count_snapshot ?? 0)} customers • {formatNumber(request.usage?.staff_count_snapshot ?? 0)} staff • {formatNumber(request.usage?.sms_sent_count ?? 0)} SMS
                  </p>
                  {request.notes ? (
                    <p className="mt-2 text-sm text-ink/70">{request.notes}</p>
                  ) : null}
                </div>

                <form action={updatePremiumRequestStatusAction} className="grid gap-2 xl:min-w-[340px]">
                  <input type="hidden" name="request_id" value={request.id} />
                  <input type="hidden" name="store_id" value={request.store_id} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select name="status" defaultValue={request.status}>
                      <option value="PENDING">Pending</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="ACTIVATED">Activated</option>
                    </select>
                    <select name="activate_plan" defaultValue="">
                      <option value="">No activation</option>
                      <option value="premium_monthly">Activate monthly</option>
                      <option value="premium_yearly">Activate yearly</option>
                    </select>
                  </div>
                  <textarea name="admin_note" rows={2} placeholder="Add admin note" />
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton
                      idle="Save"
                      pending="Saving..."
                      className="button-primary"
                    />
                    <a href={`/super-admin/stores/${request.store_id}`} className="button-secondary">
                      Open store
                    </a>
                  </div>
                </form>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}
