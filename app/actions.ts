"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearCache } from "@/lib/cache";
import { startStoreTrial } from "@/lib/billing";
import { createCustomer, createLedgerEntry } from "@/lib/baaki";
import {
  getUser,
  requireStoreContext,
  requireStorePermission,
  requireStoreRole,
} from "@/lib/auth";
import { canAddMoreStaff, getStoreEntitlements } from "@/lib/entitlements";
import {
  DEFAULT_STAFF_PERMISSIONS,
  normalizeStorePermissions,
} from "@/lib/store-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { findAuthUserByEmail } from "@/lib/team";
import { parseAmount, toEntryTimestamp } from "@/lib/utils";

export async function signInAction(formData: FormData) {
  const { supabase } = await getUser();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const { supabase } = await getUser();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    redirect("/setup?welcome=1");
  }

  redirect("/login?message=Account%20created.%20Sign%20in%20to%20continue.");
}

export async function signOutAction() {
  const { supabase } = await getUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createStoreAction(formData: FormData) {
  const { supabase, user } = await getUser();

  if (!user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) {
    redirect("/setup?error=Store%20name%20is%20required");
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, store_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect(`/setup?error=${encodeURIComponent(profileError.message)}`);
  }

  if (existingProfile?.store_id) {
    redirect(
      "/setup?error=This%20account%20has%20already%20been%20linked%20to%20a%20store%20workspace.%20It%20cannot%20create%20a%20new%20store.",
    );
  }

  const { data: storeId, error: storeError } = await supabase.rpc(
    "create_store_for_current_user",
    {
      p_name: name,
      p_phone: phone,
    },
  );

  if (storeError) {
    redirect(`/setup?error=${encodeURIComponent(storeError.message)}`);
  }

  if (!storeId) {
    redirect("/setup?error=Unable%20to%20create%20store");
  }

  clearCache(`workspace:${user.id}`);
  redirect("/dashboard");
}

export async function createCustomerAction(formData: FormData) {
  const { supabase, store } = await requireStorePermission(
    "manage_customers",
    "/customers?error=You%20do%20not%20have%20permission%20to%20add%20customers",
  );

  try {
    await createCustomer(supabase, store.id, {
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address"),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to add customer.";
    redirect(`/customers?error=${encodeURIComponent(message)}`);
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
}

export async function createLedgerEntryAction(formData: FormData) {
  const { supabase, store } = await requireStorePermission(
    "manage_ledger",
    "/dashboard?error=You%20do%20not%20have%20permission%20to%20write%20ledger%20entries",
  );

  const customerId = String(formData.get("customer_id") ?? "");
  const type = String(formData.get("type") ?? "") as "BAAKI" | "PAYMENT";

  try {
    if (!customerId || (type !== "BAAKI" && type !== "PAYMENT")) {
      throw new Error("Choose a valid entry type.");
    }

    await createLedgerEntry(supabase, store.id, {
      customer_id: customerId,
      type,
      amount: parseAmount(formData.get("amount")),
      description: String(formData.get("description") ?? ""),
      created_at: toEntryTimestamp(formData.get("entry_date")),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save ledger entry.";
    redirect(
      `/customers/${customerId}?error=${encodeURIComponent(message)}&mode=${type.toLowerCase()}`,
    );
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/dashboard");
  revalidatePath("/customers");
}

export async function quickPaymentAction(formData: FormData) {
  const { supabase, store } = await requireStorePermission(
    "manage_ledger",
    "/customers?error=You%20do%20not%20have%20permission%20to%20write%20ledger%20entries",
  );

  const customerId = String(formData.get("customer_id") ?? "");

  if (!customerId) {
    redirect("/customers?error=Customer%20is%20required");
  }

  try {
    const { data: balanceRow, error: balanceError } = await supabase
      .from("customer_balances")
      .select("balance")
      .eq("store_id", store.id)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (balanceError) {
      throw new Error(balanceError.message);
    }

    if (!balanceRow) {
      throw new Error("Customer not found in this store.");
    }

    const amount = Number(balanceRow.balance ?? 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("There is no baaki left to pay.");
    }

    await createLedgerEntry(supabase, store.id, {
      customer_id: customerId,
      type: "PAYMENT",
      amount,
      description: "Quick payment - full due",
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to record quick payment.";
    redirect(`/customers/${customerId}?error=${encodeURIComponent(message)}`);
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  redirect(`/customers/${customerId}?message=${encodeURIComponent("Quick payment recorded")}`);
}

export async function switchStoreAction(formData: FormData) {
  const { supabase, userId } = await requireStoreContext();
  const storeId = String(formData.get("store_id") ?? "");

  if (!storeId) {
    redirect("/dashboard");
  }

  const { error } = await supabase.rpc("set_active_store", {
    p_store_id: storeId,
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set("active_store_id", storeId);
  clearCache(`workspace:${userId}`);
  redirect("/dashboard");
}

export async function requestPremiumPlanAction(formData: FormData) {
  const { supabase, store, userId } = await requireStoreRole(
    "OWNER",
    "/dashboard?error=Only%20owners%20can%20request%20Premium",
  );

  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const { error } = await supabase.rpc("request_premium_for_current_store", {
    p_contact_phone: contactPhone,
    p_notes: notes,
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  clearCache(`workspace:${userId}`);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/dashboard?message=Premium%20request%20sent");
}

export async function startTrialAction() {
  const { supabase, store, userId } = await requireStoreRole(
    "OWNER",
    "/dashboard?error=Only%20owners%20can%20start%20a%20trial",
  );

  try {
    await startStoreTrial(supabase, store.id, 7, store.role);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start the free trial.";
    redirect(`/dashboard?error=${encodeURIComponent(message)}`);
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  clearCache(`workspace:${userId}`);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  redirect("/dashboard?message=Free%20trial%20started");
}

export async function deleteLedgerEntryAction(formData: FormData) {
  const { supabase, store, userId } = await requireStorePermission(
    "manage_ledger",
    "/customers?error=You%20do%20not%20have%20permission%20to%20delete%20ledger%20entries",
  );

  const entryId = String(formData.get("entry_id") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (!entryId) {
    redirect(`/customers?error=${encodeURIComponent("Entry ID is required.")}`);
  }

  // Get the entry to check ownership and get description
  const { data: entry, error: fetchError } = await supabase
    .from("ledger_entries")
    .select("description, customer_id")
    .eq("id", entryId)
    .eq("store_id", store.id)
    .single();

  if (fetchError || !entry) {
    redirect(`/customers?error=${encodeURIComponent("Ledger entry not found.")}`);
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("name")
    .eq("id", entry.customer_id)
    .single();

  if (customerError || !customer) {
    redirect(`/customers?error=${encodeURIComponent("Customer not found.")}`);
  }

  const expectedConfirmation = customer.name || entry.description || "DELETE";
  if (confirmation !== expectedConfirmation) {
    redirect(
      `/customers/${entry.customer_id}?error=${encodeURIComponent(`Type "${expectedConfirmation}" to confirm deletion.`)}`,
    );
  }

  const { error } = await supabase
    .from("ledger_entries")
    .delete()
    .eq("id", entryId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`/customers/${entry.customer_id}?error=${encodeURIComponent("Unable to delete ledger entry.")}`);
  }

  await supabase.from("audit_logs").insert({
    store_id: store.id,
    actor_user_id: userId,
    entity_type: "ledger_entry",
    entity_id: entryId,
    action: "DELETED",
    details: {
      customer_id: entry.customer_id,
      description: entry.description,
    },
  });

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  revalidatePath(`/customers/${entry.customer_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  redirect(`/customers/${entry.customer_id}?message=${encodeURIComponent("Ledger entry deleted")}`);
}

export async function updateCustomerAction(formData: FormData) {
  const { supabase, store } = await requireStorePermission(
    "manage_customers",
    "/customers?error=You%20do%20not%20have%20permission%20to%20edit%20customers",
  );

  const customerId = String(formData.get("customer_id") ?? "");

  try {
    const { error } = await supabase
      .from("customers")
      .update({
        name: String(formData.get("name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim() || null,
        address: String(formData.get("address") ?? "").trim() || null,
      })
      .eq("id", customerId)
      .eq("store_id", store.id);

    if (error) {
      throw new Error("Unable to update customer.");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update customer.";
    redirect(`/customers?error=${encodeURIComponent(message)}`);
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect(`/customers/${customerId}?message=${encodeURIComponent("Customer updated")}`);
}

export async function deleteCustomerAction(formData: FormData) {
  const { supabase, store } = await requireStorePermission(
    "manage_customers",
    "/customers?error=You%20do%20not%20have%20permission%20to%20delete%20customers",
  );

  const customerId = String(formData.get("customer_id") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  try {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("name")
      .eq("id", customerId)
      .eq("store_id", store.id)
      .single();

    if (customerError || !customer) {
      throw new Error("Customer not found.");
    }

    if (confirmation !== customer.name) {
      redirect(
        `/customers/${customerId}?error=${encodeURIComponent(`Type "${customer.name}" to confirm deletion.`)}`,
      );
    }

    // Check if there are ledger entries
    const { count, error: countError } = await supabase
      .from("ledger_entries")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("store_id", store.id);

    if (countError) {
      throw new Error("Unable to check customer data.");
    }

    if (count && count > 0) {
      throw new Error(
        "Cannot delete customer with existing ledger entries. Delete all entries first.",
      );
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId)
      .eq("store_id", store.id);

    if (error) {
      throw new Error("Unable to delete customer.");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete customer.";
    redirect(`/customers/${customerId}?error=${encodeURIComponent(message)}`);
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect(`/customers?message=${encodeURIComponent("Customer deleted")}`);
}

export async function addStaffMemberAction(formData: FormData) {
  const { supabase, store, userId } = await requireStoreRole(
    "OWNER",
    "/settings?error=Only%20owners%20can%20manage%20staff",
  );

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/settings?error=Staff%20email%20is%20required");
  }

  try {
    const entitlements = await getStoreEntitlements(supabase, store.id);
    if (!canAddMoreStaff(entitlements)) {
      throw new Error(`This plan allows up to ${entitlements.maxStaff} team members.`);
    }

    const targetUser = await findAuthUserByEmail(email);
    if (!targetUser?.id) {
      throw new Error("No existing account was found for this email.");
    }

    if (targetUser.id === userId) {
      throw new Error("You are already the owner of this store.");
    }

    const { data: existingMembership, error: membershipLookupError } = await supabase
      .from("store_memberships")
      .select("role")
      .eq("store_id", store.id)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (membershipLookupError) {
      throw new Error(membershipLookupError.message);
    }

    if (existingMembership) {
      throw new Error(
        existingMembership.role === "OWNER"
          ? "This user is already an owner in this store."
          : "This user is already a staff member in this store.",
      );
    }

    const { error } = await supabase.from("store_memberships").insert({
      store_id: store.id,
      user_id: targetUser.id,
      role: "STAFF",
      is_default: false,
      permissions: DEFAULT_STAFF_PERMISSIONS,
    });

    if (error) {
      throw new Error(error.message);
    }

    const adminClient = createAdminClient();
    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id, store_id, active_store_id, full_name")
      .eq("id", targetUser.id)
      .maybeSingle();

    if (targetProfileError) {
      throw new Error(targetProfileError.message);
    }

    const { error: profileUpsertError } = await adminClient.from("profiles").upsert({
      id: targetUser.id,
      store_id: targetProfile?.store_id ?? store.id,
      active_store_id: targetProfile?.active_store_id ?? store.id,
      full_name:
        (targetUser.user_metadata?.full_name as string | undefined) ??
        targetProfile?.full_name ??
        null,
    });

    if (profileUpsertError) {
      throw new Error(profileUpsertError.message);
    }

    await supabase.rpc("sync_store_usage_snapshots", {
      p_store_id: store.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to add this staff member.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  clearCache(`workspace:${userId}`);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?message=Staff%20member%20added");
}

export async function removeStaffMemberAction(formData: FormData) {
  const { supabase, store, userId } = await requireStoreRole(
    "OWNER",
    "/settings?error=Only%20owners%20can%20manage%20staff",
  );

  const staffUserId = String(formData.get("staff_user_id") ?? "").trim();

  if (!staffUserId) {
    redirect("/settings?error=Staff%20member%20is%20required");
  }

  try {
    const { data: membership, error: membershipError } = await supabase
      .from("store_memberships")
      .select("role")
      .eq("store_id", store.id)
      .eq("user_id", staffUserId)
      .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (!membership) {
      throw new Error("Staff membership was not found.");
    }

    if (membership.role !== "STAFF") {
      throw new Error("Only staff members can be removed from this section.");
    }

    const { error } = await supabase
      .from("store_memberships")
      .delete()
      .eq("store_id", store.id)
      .eq("user_id", staffUserId);

    if (error) {
      throw new Error(error.message);
    }

    await supabase.rpc("sync_store_usage_snapshots", {
      p_store_id: store.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to remove this staff member.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  clearCache(`workspace:${userId}`);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?message=Staff%20member%20removed");
}

export async function updateStaffPermissionsAction(formData: FormData) {
  const { supabase, store, userId } = await requireStoreRole(
    "OWNER",
    "/settings?error=Only%20owners%20can%20manage%20staff",
  );

  const staffUserId = String(formData.get("staff_user_id") ?? "").trim();
  const permissions = normalizeStorePermissions(formData.getAll("permissions"));

  if (!staffUserId) {
    redirect("/settings?error=Staff%20member%20is%20required");
  }

  try {
    const { data: membership, error: membershipError } = await supabase
      .from("store_memberships")
      .select("role")
      .eq("store_id", store.id)
      .eq("user_id", staffUserId)
      .maybeSingle();

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    if (!membership || membership.role !== "STAFF") {
      throw new Error("Staff membership was not found.");
    }

    const { error } = await supabase
      .from("store_memberships")
      .update({
        permissions,
      })
      .eq("store_id", store.id)
      .eq("user_id", staffUserId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update staff permissions.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }

  clearCache(`dashboard:${store.id}`);
  clearCache(`customers:${store.id}`);
  clearCache(`workspace:${userId}`);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?message=Staff%20permissions%20updated");
}
