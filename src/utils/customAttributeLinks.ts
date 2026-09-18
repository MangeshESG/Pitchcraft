export interface CustomAttributeDefinition {
  field_name?: string;
  field_key?: string;
  field_type?: string;
  fieldName?: string;
  fieldKey?: string;
  fieldType?: string;
}

export const normalizeAttributeKey = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export const getHyperlinkAttributeKeys = (fields: CustomAttributeDefinition[]): Set<string> => {
  const keys = new Set<string>();
  fields.forEach((field) => {
    if ((field.field_type || field.fieldType || "").trim().toLowerCase() !== "hyperlink") return;
    [field.field_name, field.field_key, field.fieldName, field.fieldKey].forEach((name) => {
      if (!name) return;
      keys.add(normalizeAttributeKey(name));
      keys.add(normalizeAttributeKey(`custom_${name}`));
    });
  });
  return keys;
};

export const getAttributeHyperlink = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text === "-") return null;
  // Only web URLs may be opened from a custom attribute.
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname && ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};
