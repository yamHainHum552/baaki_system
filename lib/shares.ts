export async function createShareToken(
  supabase: any,
  customerId: string,
  userId: string,
  expiresInDays = 7
) {
  const token = crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();

  const { data, error } = await supabase
    .from("customer_share_tokens")
    .insert({
      customer_id: customerId,
      token,
      expires_at: expiresAt,
      created_by: userId
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function validateShareToken(supabase: any, customerId: string, token: string) {
  const { data, error } = await supabase
    .from("customer_share_tokens")
    .select("id, expires_at")
    .eq("customer_id", customerId)
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export function getShareText(customerName: string, amount: number) {
  return `${customerName} ko Rs. ${Math.round(amount)} baaki cha.`;
}
