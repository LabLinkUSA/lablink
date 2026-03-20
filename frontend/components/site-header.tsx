import Link from "next/link";

import { HeaderAuthActions } from "@/components/header-auth-actions";
import { getCurrentProfile } from "@/lib/api";
import type { Role } from "@/lib/types";

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

function getNavItems(role?: Role) {
  const items = [{ href: "/listings", label: "Browse Equipment" }];

  if (!role) {
    items.push({ href: "/auth", label: "Dashboard" });
  }

  if (role === "donor_lab") {
    items.push({ href: "/donor", label: "Donor Dashboard" });
  }

  if (role === "recipient_institution") {
    items.push({ href: "/recipient", label: "Recipient Dashboard" });
  }

  if (role === "admin") {
    items.push({ href: "/admin", label: "Admin Panel" });
  }

  items.push({ href: "/about", label: "About" });

  return items;
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
  const navItems = getNavItems(profile?.user.role);
  const profileInitial = getProfileInitial(profile?.user.full_name);
  const profileRoleLabel = getRoleLabel(profile?.user.role);
  const showListEquipment = profile?.user.role === "donor_lab";

  return (
    <header className="site-header">
      <div className="shell site-header-inner">
        <Link href="/" className="brand-mark">
          <span className="brand-mark-badge">LL</span>
          <span>
            <strong>LabLink</strong>
            <small>Managed Equipment Donation Marketplace</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        {profile ? (
          <HeaderAuthActions
            dashboardHref={dashboardHref}
            profileInitial={profileInitial}
            profileName={profile.user.full_name}
            profileEmail={profile.user.email}
            profileRoleLabel={profileRoleLabel}
            institutionName={profile.institution.name}
            showListEquipment={showListEquipment}
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
