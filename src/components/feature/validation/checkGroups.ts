import { ValidationCheckType } from "../../../api/contactValidation";

/**
 * Which side panel a check belongs to.
 *
 * Two of the five checks do not verify anything — they go out and *add* data
 * to a contact: email discovery finds an address that was never there, and
 * Customisable Data Enhancement fills whatever columns it is pointed at. Sat
 * in a panel titled "Validate contacts" beside three checks that only score
 * what is already on the record, they read as the same kind of action and get
 * run by accident. So they live behind their own Enrich button instead.
 *
 * One list, used by both the panel (which checks it offers) and the toolbar
 * (which buttons exist), so a check can never appear in both panels or in
 * neither.
 */
export type RunMode = "validate" | "enrich";

/** The checks the Enrich panel offers. Everything else is a validation check. */
export const ENRICH_CHECK_TYPES: ValidationCheckType[] = [
  "email_verification",
  "data_enhancement",
];

export const modeForCheck = (checkType: ValidationCheckType): RunMode =>
  ENRICH_CHECK_TYPES.includes(checkType) ? "enrich" : "validate";

/** The check a freshly opened panel starts on. */
export const DEFAULT_CHECK_BY_MODE: Record<RunMode, ValidationCheckType> = {
  validate: "data_integrity",
  enrich: "email_verification",
};
