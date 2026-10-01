import { getCurrentProfile } from "@/lib/api";

import { AppNavClient } from "./app-nav-client";
import { buildNavModel } from "./nav-model";

export async function AppNav() {
  let profile = null;
  try {
    profile = await getCurrentProfile();
  } catch {
    profile = null;
  }
  return <AppNavClient model={buildNavModel(profile)} />;
}
