// Display names for placeholder categories.
//
// The stored category value (what the backend holds, what the icons and the
// InstructionSetManager dropdown are keyed by) stays as it is — only the label
// shown in the UI is renamed, so existing blueprints keep working.
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "core message focus": "Main focus",
  "smart conditions": "Personalization sources",
  "extra visuals": "Signature",
  "message writing style": "Writing preferences",
};

export const categoryLabel = (category: string): string =>
  CATEGORY_DISPLAY_NAMES[(category || "").trim().toLowerCase()] ?? category;

export default categoryLabel;
