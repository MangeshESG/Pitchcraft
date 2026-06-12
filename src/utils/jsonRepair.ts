/**
 * Parses a JSON object out of LLM-generated text, repairing the malformed
 * output the gpt-4o-mini-search-preview web search sometimes produces:
 *  - "\%22" emitted instead of a closing double quote around citation URLs
 *  - trailing commas before "}" / "]"
 *  - the response getting cut off mid-string when it hits the token limit
 *
 * Returns null if the content can't be turned into a usable object.
 */
export const repairAndParseJsonObject = (
  raw: string,
): Record<string, any> | null => {
  if (!raw) return null;

  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // The model occasionally escapes a literal character as "\%XX" instead of
  // the proper JSON escape (most commonly "\%22" where it meant to close a
  // string with a quote).
  cleaned = cleaned.replace(/\\%([0-9A-Fa-f]{2})/g, (_match, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

  // Strip trailing commas before a closing bracket/brace.
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  const tryParse = (value: string): Record<string, any> | null => {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct) return direct;

  // The response was likely cut off mid-stream (hit the token limit). Walk
  // the string and find the last point where a value/element fully
  // completed, then close every bracket/brace still open at that point.
  const stack: Array<"{" | "["> = [];
  let inString = false;
  let escaped = false;
  let safeEnd = -1;
  let safeStack: Array<"{" | "["> = [];

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;

        // A finished value string is a safe truncation point, but a key
        // (immediately followed by ":") is not.
        let j = i + 1;
        while (j < cleaned.length && /\s/.test(cleaned[j])) j++;
        if (cleaned[j] !== ":") {
          safeEnd = i + 1;
          safeStack = [...stack];
        }
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      safeEnd = i + 1;
      safeStack = [...stack];
    }
  }

  if (safeEnd <= 0) return null;

  let repaired = cleaned.slice(0, safeEnd).replace(/,\s*$/, "");
  for (let i = safeStack.length - 1; i >= 0; i--) {
    repaired += safeStack[i] === "{" ? "}" : "]";
  }

  return tryParse(repaired);
};
