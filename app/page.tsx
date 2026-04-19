import { redirect } from "next/navigation";
import { getWorkspaceStateForUser } from "@/lib/auth";

export default async function HomePage() {
  const { context } = await getWorkspaceStateForUser();
  redirect(context ? "/dashboard" : "/setup");
}
