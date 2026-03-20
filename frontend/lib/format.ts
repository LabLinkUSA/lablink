export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function titleCaseStatus(value: string) {
  if (value === "rejected_cancelled") {
    return "Not selected";
  }

  if (value === "pending_request") {
    return "Pending request";
  }

  if (value === "removed_by_admin") {
    return "Removed By Admin";
  }

  if (value === "removed_by_donor") {
    return "Removed By Donor";
  }

  if (value === "matched_reserved") {
    return "Match reserved";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
