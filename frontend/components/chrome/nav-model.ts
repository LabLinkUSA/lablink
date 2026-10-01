import type { AuthenticatedUser, Role } from "@/lib/types";

export type NavLink = { href: string; label: string };
export type NavModel = {
  brandHref: string;
  links: NavLink[];
  homeLinks: NavLink[];
  profile: null | {
    initial: string;
    name: string;
    email: string;
    roleLabel: string;
    institution: string;
    dashboardHref: string;
  };
};

function dashboardHref(role?: Role) {
  if (role === "donor_lab") return "/donor";
  if (role === "recipient_institution") return "/recipient";
  if (role === "admin") return "/admin";
  return "/auth";
}

function roleLabel(role?: Role) {
  if (role === "donor_lab") return "Donor dashboard";
  if (role === "recipient_institution") return "Recipient dashboard";
  if (role === "admin") return "Admin dashboard";
  return "LabLink account";
}

function links(profile: AuthenticatedUser | null): NavLink[] {
  const role = profile?.user.role;
  if (role === "admin") return [];
  const items: NavLink[] = [{ href: "/", label: "Home" }];
  if (profile) items.push({ href: "/listings", label: "Browse" });
  const verifiedDonor =
    role === "donor_lab" &&
    profile?.user.account_status === "verified" &&
    profile?.institution.verification_status === "verified";
  if (role === "donor_lab") {
    items.push({ href: verifiedDonor ? "/donor/list-equipment" : "/donor", label: "Donate" });
    items.push({ href: "/donor/request-board", label: "Request Board" });
    items.push({ href: "/donor", label: "Dashboard" });
  } else if (role === "recipient_institution") {
    items.push({ href: "/recipient", label: "Dashboard" });
  } else {
    items.push({ href: "/auth", label: "Donate" });
  }
  return items;
}

export function buildNavModel(profile: AuthenticatedUser | null): NavModel {
  const role = profile?.user.role;
  return {
    brandHref: role === "admin" ? "/admin" : "/",
    links: links(profile),
    homeLinks: [
      { href: "#mission", label: "Mission" },
      { href: "#team", label: "Team" },
    ],
    profile: profile
      ? {
          initial: profile.user.full_name?.trim().charAt(0).toUpperCase() || "U",
          name: profile.user.full_name,
          email: profile.user.email,
          roleLabel: roleLabel(role),
          institution: profile.institution.name,
          dashboardHref: dashboardHref(role),
        }
      : null,
  };
}
