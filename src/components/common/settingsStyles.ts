/**
 * Shared chrome for the account-level setting pages (Profile, General).
 * Keeping the class names in one place is what stops the pages from drifting
 * apart visually as each one is edited.
 */

export const pageClass = "min-h-[calc(100vh-87px)] bg-[#fafbfc]";
export const pageHeaderClass = "border-b border-[#eef0f3] bg-white px-8 pt-7";
export const pageTitleClass =
  "text-[28px] font-bold tracking-[-0.02em] text-[#0b1220]";
export const pageSubClass = "mt-1.5 text-[13.5px] text-[#6b7280]";
export const pageBodyClass = "p-8";

export const inputClass =
  "w-full rounded-lg border border-[#e8eaee] px-3.5 py-2.5 text-sm text-[#0b1220] outline-none transition-colors focus:border-[#3f9f42] focus:ring-1 focus:ring-[#3f9f42] disabled:bg-[#f4f5f7] disabled:text-[#6b7280]";
export const labelClass = "mb-1.5 block text-sm font-medium text-[#374151]";
export const cardClass = "rounded-xl border border-[#e8eaee] bg-white p-6";
// Sections run the full width of the page body — no left title column, so the
// card starts flush with the page header above it.
export const sectionClass = "w-full";
export const hintClass = "mt-2 text-[13px] text-[#6b7280]";

export const primaryButtonClass =
  "rounded-lg bg-[#3f9f42] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2d7a30] disabled:opacity-50 disabled:hover:bg-[#3f9f42]";
export const secondaryButtonClass =
  "rounded-lg border border-[#e8eaee] bg-white px-5 py-2.5 text-sm font-medium text-[#374151] transition-colors hover:bg-[#f4f5f7] disabled:opacity-50";

export const tabClass = (isActive: boolean) =>
  `-mb-px border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
    isActive
      ? "border-[#3f9f42] text-[#3f9f42]"
      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
  }`;

export const bannerClass = (type: "success" | "error") =>
  `mb-6 rounded-lg border px-4 py-3 text-sm ${
    type === "success"
      ? "border-[#e2f1e3] bg-[#f1f8f2] text-[#2d7a30]"
      : "border-red-200 bg-red-50 text-red-700"
  }`;
