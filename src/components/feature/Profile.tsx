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
import {
  bannerClass,
  cardClass,
  hintClass,
  inputClass,
  labelClass,
  pageBodyClass,
  pageClass,
  pageHeaderClass,
  pageSubClass,
  pageTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionClass,
  tabClass,
} from "../common/settingsStyles";

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
        method: "POST",
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
      <div className={bannerClass(banner.type)}>{banner.text}</div>
    ) : null;

  return (
    <div className={pageClass}>
      {/* Page header — mirrors the Blueprints / list page chrome */}
      <div className={pageHeaderClass}>
        <h1 className={pageTitleClass}>Profile</h1>
        <p className={pageSubClass}>
          Manage your personal details, company information and password.
          {memberSince ? ` Member since ${memberSince}.` : ""}
        </p>

        <nav className="mt-5 flex gap-8" aria-label="Profile tabs">
          <button
            onClick={() => setActiveTab("Information")}
            className={tabClass(activeTab === "Information")}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab("Password")}
            className={tabClass(activeTab === "Password")}
          >
            Password
          </button>
        </nav>
      </div>

      <div className={pageBodyClass}>
        {!userId ? (
          <p className="text-sm text-[#6b7280]">
            You need to be signed in to view your profile.
          </p>
        ) : activeTab === "Information" ? (
          <div className="max-w-4xl">
            {renderBanner(profileBanner)}

            {/* Personal information */}
            <div className={`${sectionClass} mb-8`}>
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
                  <p className={hintClass}>
                    Email and username are both used to sign in, so each must be unique.
                  </p>
                </div>
              </div>
            </div>

            {/* Company information */}
            <div className={`${sectionClass} mb-8`}>
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
              <div className="flex items-center gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving || loading || !isDirty}
                  className={primaryButtonClass}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={() => {
                    setForm(savedForm);
                    setProfileBanner(null);
                  }}
                  disabled={saving || loading || !isDirty}
                  className={secondaryButtonClass}
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

                <p className={hintClass}>
                  Use at least 8 characters. Your new password must be different from the
                  current one.
                </p>
              </div>
            </div>

            <div className={sectionClass}>
              <button
                onClick={changePassword}
                disabled={changingPassword}
                className={primaryButtonClass}
              >
                {changingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
