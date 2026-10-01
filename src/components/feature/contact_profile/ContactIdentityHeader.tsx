import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../config";
import { repairAndParseJsonObject } from "../../../utils/jsonRepair";
import GenderAvatar from "./GenderAvatar";

/** Trims a model string and treats "null"/"N/A"-style filler as absent. */
const cleanText = (value: any): string => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return /^(null|n\/a|none|not provided|not known|unknown)$/i.test(text) ? "" : text;
};

/**
 * The stored summary is raw JSON as it comes back from the API, but a round trip
 * through the rich-text editor wraps it in markup and escapes its quotes, so
 * unwrap that before trying to parse it.
 */
const stripHtmlToText = (value: string): string => {
  if (!/<[a-z/][\s\S]*>/i.test(value)) return value;
  const holder = document.createElement("div");
  holder.innerHTML = value;
  return (holder.textContent || "").trim();
};

/**
 * Pulls the structured profile summary (ProfileSummaryPrompt.cs) out of a
 * contact's LinkedIn information. Contacts summarised before that change hold
 * plain text or HTML, so this returns null and the badges simply stay hidden.
 */
export const parseProfileSummary = (linkedInInformation?: string | null): any | null => {
  const raw = stripHtmlToText((linkedInInformation || "").trim());
  if (!/^(```[a-z]*\s*)?\{/i.test(raw)) return null;

  const parsed = repairAndParseJsonObject(raw);
  if (!parsed) return null;

  const isProfile =
    "quickSummary" in parsed ||
    "chronology" in parsed ||
    "nameUsuallyAssociatedWith" in parsed;

  return isProfile ? parsed : null;
};

interface ContactIdentityHeaderProps {
  contactId?: number | string | null;
  clientId: number;
  /** Display name; falls back to "Edit contact" when empty. */
  name?: string;
  /** Raw LinkedIn information — the name badge and pronunciation come from it. */
  linkedInInformation?: string | null;
  onShowMessage: (message: string, type: "success" | "error") => void;
  onProfileImageUploaded?: () => void;
  className?: string;
}

/**
 * Profile image + name + name-usage badge + pronunciation for one contact.
 *
 * It lives in its own component because the contact page renders it above the
 * tab bar, so the name stays visible whichever tab is open, while the edit
 * modal renders it inside its own card.
 */
const ContactIdentityHeader: React.FC<ContactIdentityHeaderProps> = ({
  contactId,
  clientId,
  name,
  linkedInInformation,
  onShowMessage,
  onProfileImageUploaded,
  className = "",
}) => {
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isDeletingProfileImage, setIsDeletingProfileImage] = useState(false);
  const [profileImageVersion, setProfileImageVersion] = useState(() => Date.now());
  const [profileImageUnavailable, setProfileImageUnavailable] = useState(false);
  const [profileImageObjectUrl, setProfileImageObjectUrl] = useState("");
  const [showProfileImagePreview, setShowProfileImagePreview] = useState(false);
  const [isReplacingProfileImage, setIsReplacingProfileImage] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  const profileSummary = useMemo(
    () => parseProfileSummary(linkedInInformation),
    [linkedInInformation]
  );

  const uploadProfileImage = async (file: File) => {
    if (!contactId || !file.type.startsWith("image/")) {
      onShowMessage("Please select or paste a valid image.", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onShowMessage("Profile image must be smaller than 10 MB.", "error");
      return;
    }

    setIsUploadingProfileImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append("ContactId", String(contactId));
      uploadData.append("ClientId", String(clientId));
      uploadData.append("Name", "Profile image");
      uploadData.append("Description", "__CONTACT_PROFILE_IMAGE__");
      uploadData.append("File", file, file.name || "profile-image.png");

      await axios.post(`${API_BASE_URL}/api/Attachment/profile-image/update`, uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfileImageUnavailable(false);
      setProfileImageVersion(Date.now());
      setShowProfileImagePreview(false);
      onProfileImageUploaded?.();
      onShowMessage("Profile image updated successfully.", "success");
    } catch (error) {
      console.error("Failed to upload contact profile image", error);
      onShowMessage("Failed to update profile image.", "error");
    } finally {
      setIsUploadingProfileImage(false);
      if (profileImageInputRef.current) profileImageInputRef.current.value = "";
    }
  };

  const deleteProfileImage = async () => {
    if (!contactId || isDeletingProfileImage) return;

    setIsDeletingProfileImage(true);
    try {
      await axios.post(`${API_BASE_URL}/api/Attachment/profile-image/delete`, {
        contactId,
        clientId,
      });
      setShowProfileImagePreview(false);
      setProfileImageObjectUrl("");
      setProfileImageUnavailable(true);
      onProfileImageUploaded?.();
      onShowMessage("Profile image deleted successfully.", "success");
    } catch (error) {
      console.error("Failed to delete contact profile image", error);
      onShowMessage("Failed to delete profile image.", "error");
    } finally {
      setIsDeletingProfileImage(false);
    }
  };

  useEffect(() => {
    setProfileImageUnavailable(false);
    setProfileImageVersion(Date.now());
  }, [contactId]);

  useEffect(() => {
    if (!contactId) return;

    let active = true;
    let objectUrl = "";
    const loadProfileImage = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const response = await axios.get(
          `${API_BASE_URL}/api/Attachment/profile-image/${contactId}?clientId=${clientId}&v=${profileImageVersion}`,
          {
            responseType: "blob",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setProfileImageObjectUrl(objectUrl);
        setProfileImageUnavailable(false);
      } catch (error: any) {
        if (active) {
          setProfileImageObjectUrl("");
          setProfileImageUnavailable(true);
        }
      }
    };

    void loadProfileImage();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contactId, clientId, profileImageVersion]);

  return (
    <div className={`contact-identity-header flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <button
            type="button"
            aria-label={profileImageObjectUrl ? "View contact profile image" : "Add contact profile image"}
            title={profileImageObjectUrl ? "View profile image" : "Click to upload, or focus here and paste a copied image"}
            onClick={() => {
              setIsReplacingProfileImage(false);
              setShowProfileImagePreview(true);
            }}
            onPaste={(event) => {
              const image = Array.from(event.clipboardData.items)
                .find((item) => item.type.startsWith("image/"))
                ?.getAsFile();
              if (image) {
                event.preventDefault();
                void uploadProfileImage(image);
              }
            }}
            disabled={isUploadingProfileImage}
            className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#3f9f42] bg-[#f0f9f0] text-[#3f9f42] transition hover:bg-[#e4f5e5] disabled:cursor-wait disabled:opacity-60"
          >
            {!profileImageUnavailable && profileImageObjectUrl ? (
              <img
                src={profileImageObjectUrl}
                alt="Contact profile"
                className="h-full w-full object-cover"
                onError={() => setProfileImageUnavailable(true)}
              />
            ) : (
              <span className="text-2xl font-light">+</span>
            )}
            {isUploadingProfileImage && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-semibold">...</span>
            )}
          </button>
        </div>
        <input
          ref={profileImageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const image = event.target.files?.[0];
            if (image) void uploadProfileImage(image);
          }}
        />
        {showProfileImagePreview && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Contact profile image preview"
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-6"
            onClick={() => {
              setShowProfileImagePreview(false);
              setIsReplacingProfileImage(false);
            }}
          >
            <div
              className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center justify-center rounded-xl bg-white p-3 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close image preview"
                onClick={() => {
                  setShowProfileImagePreview(false);
                  setIsReplacingProfileImage(false);
                }}
                className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-2xl leading-none text-gray-700 shadow-md"
              >
                &times;
              </button>
              {profileImageObjectUrl && !profileImageUnavailable && !isReplacingProfileImage ? (
                <>
                  <img
                    src={profileImageObjectUrl}
                    alt="Contact profile enlarged"
                    className="max-h-[82vh] max-w-[82vw] rounded-lg object-contain"
                  />
                  <div className="flex w-full justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsReplacingProfileImage(true)}
                      disabled={isUploadingProfileImage || isDeletingProfileImage}
                      className="rounded-md bg-[#3f9f42] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {isUploadingProfileImage ? "Updating..." : "Update"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteProfileImage()}
                      disabled={isUploadingProfileImage || isDeletingProfileImage}
                      className="rounded-md border border-red-500 bg-white px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-60"
                    >
                      {isDeletingProfileImage ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-[420px] max-w-[80vw] p-5">
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">
                    {profileImageObjectUrl ? "Update profile image" : "Add profile image"}
                  </h2>
                  <div className="relative flex min-h-44 flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#3f9f42] bg-[#f6fbf6] p-6 text-center focus-within:ring-2 focus-within:ring-[#3f9f42]/30">
                    <div
                      tabIndex={0}
                      autoFocus
                      contentEditable={!isUploadingProfileImage}
                      suppressContentEditableWarning
                      aria-label="Paste copied image here"
                      onBeforeInput={(event) => event.preventDefault()}
                      onPaste={(event) => {
                        const image = Array.from(event.clipboardData.items)
                          .find((item) => item.type.startsWith("image/"))
                          ?.getAsFile();
                        event.preventDefault();
                        if (image) {
                          void uploadProfileImage(image);
                        } else {
                          onShowMessage("Clipboard does not contain an image.", "error");
                        }
                      }}
                      className="absolute inset-0 z-10 cursor-text rounded-lg outline-none"
                    />
                    <div className="pointer-events-none mb-2 text-3xl text-[#3f9f42]">+</div>
                    <div className="pointer-events-none font-medium text-gray-800">Paste copied image here</div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      disabled={isUploadingProfileImage}
                      className="rounded-md bg-[#3f9f42] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {isUploadingProfileImage ? "Uploading..." : "Upload from device"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-xl font-[600] text-gray-900">{cleanText(name) || "Contact"}</h1>
        {/* How the first name is usually used, then how the name sounds —
            both come from the structured profile summary. */}
        <GenderAvatar value={profileSummary?.nameUsuallyAssociatedWith} />
        {cleanText(profileSummary?.pronunciation) && (
          <span
            title="Pronunciation"
            className="rounded-full bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-1 text-xs italic text-gray-500"
          >
            “{cleanText(profileSummary?.pronunciation)}”
          </span>
        )}
      </div>
    </div>
  );
};

export default ContactIdentityHeader;
