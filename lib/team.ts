import { createAdminClient } from "@/lib/supabase/admin";

export type TeamMember = {
  user_id: string;
  role: "OWNER" | "STAFF";
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export async function listStoreTeamMembers(storeId: string): Promise<TeamMember[]> {
  const adminClient = createAdminClient();
  const { data: membershipRows, error } = await adminClient
    .from("store_memberships")
    .select("user_id, role, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const userIds = Array.from(new Set((membershipRows ?? []).map((row) => row.user_id)));
  if (!userIds.length) {
    return [];
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? null]));
  const authRows = await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await adminClient.auth.admin.getUserById(userId);
      return {
        userId,
        email: data.user?.email ?? null,
        phone: data.user?.phone ?? null,
      };
    }),
  );
  const authMap = new Map(authRows.map((row) => [row.userId, row]));

  return (membershipRows ?? []).map((row) => ({
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    full_name: profileMap.get(row.user_id) ?? null,
    email: authMap.get(row.user_id)?.email ?? null,
    phone: authMap.get(row.user_id)?.phone ?? null,
  }));
}

export async function findAuthUserByEmail(email: string) {
  const adminClient = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(error.message);
    }

    const matchedUser =
      data.users.find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null;

    if (matchedUser) {
      return matchedUser;
    }

    if (!data.users.length || data.users.length < 200) {
      break;
    }
  }

  return null;
}
