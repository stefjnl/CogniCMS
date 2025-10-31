import { redirect } from "next/navigation";
import { PasswordLogin } from "@/components/auth/PasswordLogin";
import { getSession } from "@/lib/utils/auth";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100 p-4">
      <PasswordLogin />
    </div>
  );
}
