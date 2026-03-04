/**
 * Common Date Formatting Utilities
 * These functions format dates in the user's local browser timezone
 * Usage: Import and use these functions across all components to maintain consistency
 */

/**
 * Formats a date string to "DD MMM YYYY, HH:MM AM/PM" format in local timezone
 * @param dateString - ISO date string from API
 * @returns Formatted date and time string, or "-" if invalid
 * @example formatDateTimeLocal("2026-02-10T12:22:00") => "10 Feb 2026, 12:22 PM"
 */
export const formatDateTimeLocal = (dateString?: string): string => {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch (e) {
    return "-";
  }
};

/**
 * Formats a date string to "HH:MM AM/PM" format in local timezone
 * @param dateString - ISO date string from API
 * @returns Formatted time string, or "-" if invalid
 * @example formatTimeLocal("2026-02-10T12:22:00") => "12:22 PM"
 */
export const formatTimeLocal = (dateString?: string): string => {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch (e) {
    return "-";
  }
};
