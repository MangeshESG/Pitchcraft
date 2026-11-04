/**
 * The value sent for a blueprint's {manual_instruction} slot.
 *
 * The user types a steer next to the email ("shorten the opening", "mention
 * their funding round"), but a steer on its own is not answerable: the model
 * is being asked to change an email it cannot see. So the payload carries
 * three parts — the instruction, a line telling the model what to do with it,
 * and the body as it stands at that moment:
 *
 *     <instruction>
 *
 *     Apply the manual instruction above to the email body below. …
 *
 *     <email body>
 *
 * The body is passed as authored, HTML and all, because the rule asks for its
 * markup, links and layout to survive the edit — stripping the tags here would
 * be asking the model to preserve something it was never shown.
 */

/** The line between the instruction and the body. */
export const MANUAL_INSTRUCTION_BRIDGE =
  "Apply the manual instruction above to the email body below. Make only the " +
  "explicitly requested changes. Preserve its existing structure, layout, " +
  "formatting, HTML tags, attributes, links, and all other content exactly, " +
  "except where a requested change requires an adjustment. Do not rewrite, " +
  "add, remove, or reorder anything else. Return only the updated email body, " +
  "without explanations or commentary.";

/**
 * Builds the {manual_instruction} value from what the user typed and the body
 * on screen.
 *
 * Returns "" when no instruction was typed, so a generation that carries no
 * steer clears the slot instead of filling it with a rule about nothing.
 * With an instruction but no body yet — the compose popup before its first
 * Generate — only the instruction is sent, since there is no email below for
 * the rule to point at.
 */
export const buildManualInstruction = (
  instruction: string | null | undefined,
  emailBody: string | null | undefined,
): string => {
  const steer = (instruction ?? "").trim();
  if (!steer) return "";

  const body = (emailBody ?? "").trim();
  if (!body) return steer;

  return `${steer}\n\n${MANUAL_INSTRUCTION_BRIDGE}\n\n${body}`;
};
