import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import API_BASE_URL from "../../config";
import { RootState } from "../../Redux/store";
import {
  saveEmail,
  saveFirstName,
  saveLastName,
  saveUserName,
} from "../../slices/authSLice";

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  companyName: string;
  jobTitle: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_PROFILE: ProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  companyName: "",
  jobTitle: "",
};

const EMPTY_PASSWORD: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type ProfileTab = "Information" | "Password";
type Banner = { type: "success" | "error"; text: string } | null;

const inputClass =
  "w-full rounded-lg border border-[#e8eaee] px-3.5 py-2.5 text-sm text-[#0b1220] outline-none transition-colors focus:border-[#3f9f42] focus:ring-1 focus:ring-[#3f9f42] disabled:bg-[#f4f5f7] disabled:text-[#6b7280]";
const labelClass = "mb-1.5 block text-sm font-medium text-[#374151]";
const cardClass = "rounded-xl border border-[#e8eaee] bg-white p-6";
const sectionClass = "grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr] md:gap-8";
const sectionTitleClass = "text-base font-semibold text-[#0b1220] md:pt-1";
const required = <span className="text-[#ef4444]"> *</span>;

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  // The profile always belongs to the logged in account — never the client an
  // admin has selected in the header dropdown.
  const userId = useSelector((state: RootState) => state.auth.userId);

  const [activeTab, setActiveTab] = useState<ProfileTab>("Information");
  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(EMPTY_PASSWORD);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileBanner, setProfileBanner] = useState<Banner>(null);
  const [passwordBanner, setPasswordBanner] = useState<Banner>(null);
  const [memberSince, setMemberSince] = useState<string>("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`${API_BASE_URL}/api/login/profile/${userId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const loaded: ProfileForm = {
          firstName: data.firstName ?? data.FirstName ?? "",
          lastName: data.lastName ?? data.LastName ?? "",
          email: data.email ?? data.Email ?? "",
          username: data.username ?? data.Username ?? "",
          companyName: data.companyName ?? data.CompanyName ?? "",
          jobTitle: data.jobTitle ?? data.JobTitle ?? "",
        };
        setForm(loaded);
        setSavedForm(loaded);
        const createdAt = data.createdAt ?? data.CreatedAt;
        if (createdAt) {
          setMemberSince(new Date(createdAt).toLocaleDateString());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfileBanner({
            type: "error",
            text: "Could not load your profile details.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setProfileBanner(null);
  };

  const updatePasswordField = (field: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordBanner(null);
  };

  const isDirty = (Object.keys(form) as (keyof ProfileForm)[]).some(
    (key) => form[key] !== savedForm[key]
  );

  const saveProfile = async () => {
    if (!userId) return;

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setProfileBanner({ type: "error", text: "First and last name are required." });
      return;
    }
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setProfileBanner({ type: "error", text: "Enter a valid email address." });
      return;
    }
    if (!form.username.trim()) {
      setProfileBanner({ type: "error", text: "Username is required." });
      return;
    }

    setSaving(true);
    setProfileBanner(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setProfileBanner({
          type: "error",
          text: data?.message || "Could not save your profile.",
        });
        return;
      }

      setSavedForm(form);
      // Keep the header (and anything else reading auth state) in sync.
      dispatch(saveFirstName(form.firstName));
      dispatch(saveLastName(form.lastName));
      dispatch(saveEmail(form.email));
      dispatch(saveUserName(form.username));

      setProfileBanner({
        type: "success",
        text: data?.message || "Profile updated successfully.",
      });
    } catch {
      setProfileBanner({ type: "error", text: "Could not save your profile." });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!userId) return;

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordBanner({ type: "error", text: "All password fields are required." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordBanner({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordBanner({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordBanner({
        type: "error",
        text: "New password must be different from the current password.",
      });
      return;
    }

    setChangingPassword(true);
    setPasswordBanner(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/login/profile/${userId}/change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setPasswordBanner({
          type: "error",
          text: data?.message || "Could not change your password.",
        });
        return;
      }

      setPasswordForm(EMPTY_PASSWORD);
      setPasswordBanner({
        type: "success",
        text: data?.message || "Password changed successfully.",
      });
    } catch {
      setPasswordBanner({ type: "error", text: "Could not change your password." });
    } finally {
      setChangingPassword(false);
    }
  };

  const renderBanner = (banner: Banner) =>
    banner ? (
      <div
        className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
          banner.type === "success"
            ? "border-[#e2f1e3] bg-[#f1f8f2] text-[#2d7a30]"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {banner.text}
      </div>
    ) : null;

  const tabClass = (tabName: ProfileTab) =>
    `-mb-px border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
      activeTab === tabName
        ? "border-[#3f9f42] text-[#3f9f42]"
        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
    }`;

  return (
    <div className="min-h-[calc(100vh-87px)] bg-[#fafbfc]">
      {/* Page header — mirrors the Blueprints / list page chrome */}
      <div className="border-b border-[#eef0f3] bg-white px-8 pt-7">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#0b1220]">
          Profile
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[#6b7280]">
          Manage your personal details, company information and password.
          {memberSince ? ` Member since ${memberSince}.` : ""}
        </p>

        <nav className="mt-5 flex gap-8" aria-label="Profile tabs">
          <button
            onClick={() => setActiveTab("Information")}
            className={tabClass("Information")}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab("Password")}
            className={tabClass("Password")}
          >
            Password
          </button>
        </nav>
      </div>

      <div className="p-8">
        {!userId ? (
          <p className="text-sm text-[#6b7280]">
            You need to be signed in to view your profile.
          </p>
        ) : activeTab === "Information" ? (
          <div className="max-w-4xl">
            {renderBanner(profileBanner)}

            {/* Personal information */}
            <div className={`${sectionClass} mb-8`}>
              <h2 className={sectionTitleClass}>Personal information</h2>
              <div className={cardClass}>
                <div className="mb-4">
                  <label className={labelClass}>Email address{required}</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    disabled={loading}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>First name{required}</label>
                    <input
                      className={inputClass}
                      value={form.firstName}
                      disabled={loading}
                      onChange={(event) => updateField("firstName", event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last name{required}</label>
                    <input
                      className={inputClass}
                      value={form.lastName}
                      disabled={loading}
                      onChange={(event) => updateField("lastName", event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Username{required}</label>
                  <input
                    className={inputClass}
                    value={form.username}
                    disabled={loading}
                    onChange={(event) => updateField("username", event.target.value)}
                  />
                  <p className="mt-2 text-[13px] text-[#6b7280]">
                    Email and username are both used to sign in, so each must be unique.
                  </p>
                </div>
              </div>
            </div>

            {/* Company information */}
            <div className={`${sectionClass} mb-8`}>
              <h2 className={sectionTitleClass}>Company information</h2>
              <div className={cardClass}>
                <div className="mb-4">
                  <label className={labelClass}>Company / Organisation</label>
                  <input
                    className={inputClass}
                    value={form.companyName}
                    disabled={loading}
                    onChange={(event) => updateField("companyName", event.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Job title</label>
                  <input
                    className={inputClass}
                    value={form.jobTitle}
                    disabled={loading}
                    onChange={(event) => updateField("jobTitle", event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div />
              <div className="flex items-center gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving || loading || !isDirty}
                  className="rounded-lg bg-[#3f9f42] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2d7a30] disabled:opacity-50 disabled:hover:bg-[#3f9f42]"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={() => {
                    setForm(savedForm);
                    setProfileBanner(null);
                  }}
                  disabled={saving || loading || !isDirty}
                  className="rounded-lg border border-[#e8eaee] bg-white px-5 py-2.5 text-sm font-medium text-[#374151] transition-colors hover:bg-[#f4f5f7] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl">
            {renderBanner(passwordBanner)}

            <div className={`${sectionClass} mb-8`}>
              <h2 className={sectionTitleClass}>Change password</h2>
              <div className={cardClass}>
                <div className="mb-4">
                  <label className={labelClass}>Current password{required}</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className={inputClass}
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      updatePasswordField("currentPassword", event.target.value)
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>New password{required}</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={inputClass}
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        updatePasswordField("newPassword", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm new password{required}</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={inputClass}
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        updatePasswordField("confirmPassword", event.target.value)
                      }
                    />
                  </div>
                </div>

                <p className="mt-2 text-[13px] text-[#6b7280]">
                  Use at least 8 characters. Your new password must be different from the
                  current one.
                </p>
              </div>
            </div>

            <div className={sectionClass}>
              <div />
              <div>
                <button
                  onClick={changePassword}
                  disabled={changingPassword}
                  className="rounded-lg bg-[#3f9f42] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2d7a30] disabled:opacity-50 disabled:hover:bg-[#3f9f42]"
                >
                  {changingPassword ? "Updating..." : "Update password"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
