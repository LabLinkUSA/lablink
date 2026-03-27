import Link from "next/link";

import { HeaderAuthActions } from "@/components/header-auth-actions";
import { getCurrentProfile } from "@/lib/api";
import type { AuthenticatedUser, Role } from "@/lib/types";

function getDashboardHref(role?: Role) {
  if (role === "donor_lab") {
    return "/donor";
  }

  if (role === "recipient_institution") {
    return "/recipient";
  }

  if (role === "admin") {
    return "/admin";
  }

  return "/auth";
}

function getNavItems(profile?: AuthenticatedUser | null) {
  const role = profile?.user.role;
  if (role === "admin") {
    return [];
  }

  const navItems = [{ href: "/", label: "Home" }, { href: "/listings", label: "Browse" }];
  const isVerifiedDonor =
    role === "donor_lab" &&
    profile?.user.account_status === "verified" &&
    profile?.institution.verification_status === "verified";

  if (role === "donor_lab") {
    navItems.push({ href: isVerifiedDonor ? "/donor/list-equipment" : "/donor", label: "Donate" });
    navItems.push({ href: "/donor", label: "Dashboard" });
  } else if (role === "recipient_institution") {
    navItems.push({ href: "/recipient", label: "Dashboard" });
  } else {
    navItems.push({ href: "/auth", label: "Donate" });
  }

  navItems.push({ href: "/about", label: "About" });
  return navItems;
}

function getProfileInitial(name: string | undefined) {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return "U";
  }

  return trimmedName.charAt(0).toUpperCase();
}

function getRoleLabel(role?: Role) {
  if (role === "donor_lab") {
    return "Donor dashboard";
  }

  if (role === "recipient_institution") {
    return "Recipient dashboard";
  }

  if (role === "admin") {
    return "Admin dashboard";
  }

  return "LabLink account";
}

export async function SiteHeader() {
  let profile = null;

  try {
    profile = await getCurrentProfile();
  } catch {
    profile = null;
  }

  const dashboardHref = getDashboardHref(profile?.user.role);
  const navItems = getNavItems(profile);
  const profileInitial = getProfileInitial(profile?.user.full_name);
  const profileRoleLabel = getRoleLabel(profile?.user.role);
  const brandHref = profile?.user.role === "admin" ? "/admin" : "/";
  const brandLabel = profile?.user.role === "admin" ? "LabLink admin dashboard" : "LabLink home";

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href={brandHref} className="brand-mark" aria-label={brandLabel}>
          <strong>LabLink</strong>
        </Link>
        {navItems.length > 0 ? (
          <nav className="site-nav" aria-label="Primary navigation">
            {navItems.map((item, index) => (
              <Link key={`${item.label}-${item.href}-${index}`} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div />
        )}
        {profile ? (
          <HeaderAuthActions
            dashboardHref={dashboardHref}
            profileInitial={profileInitial}
            profileName={profile.user.full_name}
            profileEmail={profile.user.email}
            profileRoleLabel={profileRoleLabel}
            institutionName={profile.institution.name}
          />
        ) : (
          <div className="site-header-actions">
            <Link href="/auth" className="button button-outline">
              Sign In / Verify
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
