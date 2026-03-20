"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type HeaderAuthActionsProps = {
  dashboardHref: string;
  profileInitial: string;
  profileName: string;
  profileEmail: string;
  profileRoleLabel: string;
  institutionName: string;
  showListEquipment: boolean;
};

const supabase = createSupabaseBrowserClient();

export function HeaderAuthActions({
  dashboardHref,
  profileInitial,
  profileName,
  profileEmail,
  profileRoleLabel,
  institutionName,
  showListEquipment,
}: HeaderAuthActionsProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        throw error;
      }

      window.location.replace("/");
    } catch {
      setIsPending(false);
    }
  }

  return (
    <div className="site-header-actions">
      {showListEquipment ? (
        <Link href="/donor/list-equipment" className="button button-secondary">
          List Equipment
        </Link>
      ) : null}
      <div className="header-profile-menu">
        <Link
          href={dashboardHref}
          className="header-profile-button"
          aria-label={`${profileName} profile`}
          title={profileName}
        >
          {profileInitial}
        </Link>
        <div className="header-profile-tooltip" role="status" aria-live="polite">
          <strong>{profileName}</strong>
          <span>{profileRoleLabel}</span>
          <span>{institutionName}</span>
          <span>{profileEmail}</span>
        </div>
      </div>
      <button type="button" className="button button-outline" onClick={handleSignOut} disabled={isPending}>
        {isPending ? "Logging out..." : "Log out"}
      </button>
    </div>
  );
}
