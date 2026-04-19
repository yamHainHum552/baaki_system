import { deleteCustomerAction } from "@/app/actions";

export async function POST(request: Request) {
  const formData = await request.formData();
  return deleteCustomerAction(formData);
}
