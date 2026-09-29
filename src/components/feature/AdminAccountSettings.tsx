import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { AdminCreateUserInput, createUserByAdmin } from "../../utils/adminAccounts";
import {
  bannerClass,
  cardClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
} from "../common/settingsStyles";

type Banner = { type: "success" | "error"; text: string } | null;

const EMPTY_FORM: AdminCreateUserInput = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  password: "",
  companyName: "",
  jobTitle: "",
};

/** Email, username and password are what the API insists on; the rest is profile. */
const REQUIRED_FIELDS: (keyof AdminCreateUserInput)[] = [
  "email",
  "username",
  "password",
];

const FIELDS: {
  key: keyof AdminCreateUserInput;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}[] = [
  { key: "firstName", label: "First name", autoComplete: "off" },
  { key: "lastName", label: "Last name", autoComplete: "off" },
  { key: "email", label: "Email", type: "email", autoComplete: "off" },
  { key: "username", label: "Username", autoComplete: "off" },
  {
    key: "password",
    label: "Password",
    type: "text",
    autoComplete: "new-password",
    // Shown rather than masked: whoever creates the account has to pass it on,
    // and a masked field they cannot read is where typos survive.
    hint: "Shown so it can be copied and sent to the person. They can change it after signing in.",
  },
  { key: "companyName", label: "Company" },
  { key: "jobTitle", label: "Job title" },
];

/**
 * Accounts — the admin page tab for creating a client account directly,
 * for onboarding someone without walking them through sign-up.
 *
 * Restricted on the API to the client ids in `SuperAdmins:ClientIds`, since
 * this hands out a working login. The new account gets the default custom
 * fields and a Basic subscription, exactly as sign-up does.
 */
const AdminAccountSettings: React.FC = () => {
  const [form, setForm] = useState<AdminCreateUserInput>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const setField = (key: keyof AdminCreateUserInput, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const isComplete = REQUIRED_FIELDS.every((key) => form[key].trim() !== "");
  const isDirty = Object.values(form).some((value) => value.trim() !== "");

  const handleCreate = async () => {
    if (!isComplete) return;

    setIsSaving(true);
    setBanner(null);

    try {
      const created = await createUserByAdmin({
        ...form,
        email: form.email.trim(),
        username: form.username.trim(),
      });

      setBanner({
        type: "success",
        text: `Created ${form.username.trim()} as client ${created.userId}.`,
      });
      setForm(EMPTY_FORM);
    } catch (error: any) {
      setBanner({
        type: "error",
        text: error?.message || "Could not create the account.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      <div className={sectionClass}>
        <div className={cardClass}>
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e2f1e3] bg-[#f1f8f2] text-[#3f9f42]">
              <UserPlus size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#0b1220]">
                Create a client account
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#6b7280]">
                The account can sign in straight away. It starts on Basic with
                the default custom fields, the same as one created through
                sign-up.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div
                key={field.key}
                className={field.key === "password" ? "sm:col-span-2" : ""}
              >
                <label className={labelClass} htmlFor={`admin-user-${field.key}`}>
                  {field.label}
                  {!REQUIRED_FIELDS.includes(field.key) && (
                    <span className="font-normal text-[#6b7280]"> (optional)</span>
                  )}
                </label>
                <input
                  id={`admin-user-${field.key}`}
                  type={field.type ?? "text"}
                  value={form[field.key]}
                  disabled={isSaving}
                  autoComplete={field.autoComplete}
                  onChange={(event) => setField(field.key, event.target.value)}
                  className={inputClass}
                />
                {field.hint && <p className={hintClass}>{field.hint}</p>}
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-[#f1f2f4] pt-4">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSaving || !isComplete}
              className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isSaving ? "Creating…" : "Create account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setBanner(null);
              }}
              disabled={isSaving || !isDirty}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Clear
            </button>
          </div>

          <p className={`${hintClass} border-t border-[#f1f2f4] pt-4`}>
            No email is sent — the person is not told the account exists, so
            pass the username and password on yourself. The API refuses an
            email or username already in use.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAccountSettings;
