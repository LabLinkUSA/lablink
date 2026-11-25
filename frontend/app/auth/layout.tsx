import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AUTH_ENABLED } from "@/lib/site-mode";

export default function AuthLayout({ children }: { children: ReactNode }) {
  if (!AUTH_ENABLED) {
    redirect("/");
  }
  return children;
}
