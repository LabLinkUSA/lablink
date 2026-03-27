export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatNotificationDay(value: string) {
  const target = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (sameDay(target, today)) {
    return "Today";
  }

  if (sameDay(target, yesterday)) {
    return "Yesterday";
  }

  return formatDate(value);
}

export function titleCaseStatus(value: string) {
  if (value === "listing_under_review") {
    return "Listing Under Review";
  }

  if (value === "approved_matched") {
    return "Matched";
  }

  if (value === "live") {
    return "Available";
  }

  if (value === "rejected_cancelled") {
    return "Not selected";
  }

  if (value === "pending_request") {
    return "Pending request";
  }

  if (value === "submitted") {
    return "Pending";
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

  if (value === "fulfilled") {
    return "Donated";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
