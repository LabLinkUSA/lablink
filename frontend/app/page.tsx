import { HomePageFrame } from "@/components/home-page-frame";
import { getCurrentProfile } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  redirectAdminToDashboard(profile);

  return (
    <div className="home-redesign-page">
      <HomePageFrame />
    </div>
  );
}
