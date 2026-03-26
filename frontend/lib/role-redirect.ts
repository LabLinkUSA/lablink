import { redirect } from "next/navigation";

import type { AuthenticatedUser } from "@/lib/types";

export function redirectAdminToDashboard(profile: AuthenticatedUser | null) {
  if (profile?.user.role === "admin") {
    redirect("/admin");
  }
}
