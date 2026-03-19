export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function titleCaseStatus(value: string) {
  if (value === "removed_by_admin") {
    return "Removed By Admin";
  }

  if (value === "removed_by_donor") {
    return "Removed By Donor";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
