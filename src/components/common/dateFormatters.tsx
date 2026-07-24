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
import { formatUserDateTime, formatUserTime } from "./dateTimePreferences";

export const formatDateTimeLocal = (dateString?: string): string =>
  formatUserDateTime(dateString);

/**
 * Formats a date string to "HH:MM AM/PM" format in local timezone
 * @param dateString - ISO date string from API
 * @returns Formatted time string, or "-" if invalid
 * @example formatTimeLocal("2026-02-10T12:22:00") => "12:22 PM"
 */
export const formatTimeLocal = (dateString?: string): string =>
  formatUserTime(dateString);
