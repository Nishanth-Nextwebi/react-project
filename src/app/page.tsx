import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
