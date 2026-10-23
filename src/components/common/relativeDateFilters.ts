import { getDateTimePreferences } from "./dateTimePreferences";

/**
 * Today / Yesterday / Tomorrow as filter values.
 *
 * A date filter saved into a view has to keep meaning what it said: a view
 * built as "Today" is expected to show today's rows every time it is opened,
 * not the rows of the day it was built on. So the condition stores the token
 * rather than a resolved date, and both the browser and the API turn it into a
 * calendar day at the moment they filter.
 *
 * Which day that is depends on where the account is, so the day comes from the
 * time zone in Settings - the API reads the same stored setting, so a view
 * filters the same whoever opens it and from wherever.
 */
export const RELATIVE_DATE_TOKENS = ["@today", "@yesterday", "@tomorrow"] as const;

export type RelativeDateToken = (typeof RELATIVE_DATE_TOKENS)[number];

export const RELATIVE_DATE_OPTIONS: { token: RelativeDateToken; label: string }[] = [
  { token: "@today", label: "Today" },
  { token: "@yesterday", label: "Yesterday" },
  { token: "@tomorrow", label: "Tomorrow" },
];

export const isRelativeDateToken = (value: any): value is RelativeDateToken =>
  typeof value === "string" &&
  RELATIVE_DATE_TOKENS.includes(value.trim().toLowerCase() as RelativeDateToken);

export const relativeDateLabel = (value: any) =>
  RELATIVE_DATE_OPTIONS.find(
    (option) => option.token === String(value ?? "").trim().toLowerCase()
  )?.label;

/** A calendar day, as the sortable yyyy-MM-dd the rest of this module passes around. */
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number) => String(value).padStart(2, "0");

/** The calendar day an instant falls on, in the account's time zone. */
const dayInAccountZone = (date: Date) => {
  const { timeZone } = getDateTimePreferences();

  try {
    // en-CA renders as yyyy-MM-dd, which sorts chronologically as a string.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
};

/**
 * A day shifted by whole days. Done on the calendar numbers rather than by
 * adding hours to an instant, so a clock change cannot turn "yesterday" into
 * the same day again.
 */
const shiftDay = (day: string, offset: number) => {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date));
  shifted.setUTCDate(shifted.getUTCDate() + offset);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate()
  )}`;
};

/**
 * The calendar day a filter value stands for: a token resolved against the
 * account's time zone, or a date the user picked. Null for anything else,
 * which is how a caller tells a date condition from any other condition.
 */
export const resolveFilterDay = (value: any): string | null => {
  const raw = String(value ?? "").trim();

  if (isRelativeDateToken(raw)) {
    const today = dayInAccountZone(new Date());
    switch (raw.toLowerCase() as RelativeDateToken) {
      case "@today":
        return today;
      case "@yesterday":
        return shiftDay(today, -1);
      case "@tomorrow":
        return shiftDay(today, 1);
    }
  }

  return CALENDAR_DAY.test(raw) ? raw : null;
};

/**
 * The calendar day a stored value falls on.
 *
 * A value carrying a time is an instant, so it is read in the account's time
 * zone - 23:00 UTC is already tomorrow in Delhi. A value that is only a date
 * (what a custom date field holds) is that day already, and converting it
 * would just push it across midnight.
 */
const dayOfStoredValue = (value: any): string | null => {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (raw === "") return null;
  if (CALENDAR_DAY.test(raw)) return raw;

  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return null;

  return dayInAccountZone(instant);
};

/**
 * A date condition compared by calendar day.
 *
 * The stored value is usually a timestamp, so comparing it against a day as an
 * instant answers "equals today" with nothing at all (10:42 is not midnight)
 * and "after today" with everything since midnight. Comparing the days
 * themselves is what the condition reads as.
 *
 * Null when the condition's value is not a day, so the caller keeps its own
 * handling for everything else.
 */
export const matchesDayCondition = (
  rowValue: any,
  operator: string,
  conditionValue: any
): boolean | null => {
  const targetDay = resolveFilterDay(conditionValue);
  if (!targetDay) return null;

  const rowDay = dayOfStoredValue(rowValue);
  if (!rowDay) return false;

  switch (operator) {
    case "equals":
      return rowDay === targetDay;
    case "notEquals":
      return rowDay !== targetDay;
    case "before":
      return rowDay < targetDay;
    case "after":
      return rowDay > targetDay;
    default:
      return null;
  }
};
