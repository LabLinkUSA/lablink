"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type HeaderAuthActionsProps = {
  dashboardHref: string;
  profileInitial: string;
  profileName: string;
  showListEquipment: boolean;
};

const supabase = createSupabaseBrowserClient();

export function HeaderAuthActions({
  dashboardHref,
  profileInitial,
  profileName,
  showListEquipment,
}: HeaderAuthActionsProps) {
  const [isPending, setIsPending] = useState(false);

  function handleSignOut() {
    setIsPending(true);

    startTransition(() => {
      void supabase.auth
        .signOut()
        .then(({ error }) => {
          if (error) {
            throw error;
          }

          window.location.assign("/");
        })
        .catch(() => {
          setIsPending(false);
        });
    });
  }

  return (
    <div className="site-header-actions">
      {showListEquipment ? (
        <Link href="/donor/list-equipment" className="button button-secondary">
          List Equipment
        </Link>
      ) : null}
      <Link
        href={dashboardHref}
        className="header-profile-button"
        aria-label={`${profileName} profile`}
        title={profileName}
      >
        {profileInitial}
      </Link>
      <button type="button" className="button button-outline" onClick={handleSignOut} disabled={isPending}>
        {isPending ? "Logging out..." : "Log out"}
      </button>
    </div>
  );
}
