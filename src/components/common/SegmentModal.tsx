import React, { useState, useEffect } from "react";
import API_BASE_URL from "../../config";

interface SegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactsCount: number;
  effectiveUserId: string;
  token?: string | null;
  dataFileId?: number | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onContactsCleared: () => void;
  getContactIds: () => number[];
}

interface Segment {
  id: number;
  name: string;
  contactCount?: number;
}

const SegmentModal: React.FC<SegmentModalProps> = ({
  isOpen,
  onClose,
  selectedContactsCount,
  effectiveUserId,
  token,
  dataFileId,
  onSuccess,
  onError,
  onContactsCleared,
  getContactIds,
}) => {
  const [segmentModalTab, setSegmentModalTab] = useState<"create" | "move">("create");
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [selectedExistingSegment, setSelectedExistingSegment] = useState<string>("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [savingSegment, setSavingSegment] = useState(false);
  const [movingToSegment, setMovingToSegment] = useState(false);

  useEffect(() => {
    if (isOpen && segments.length === 0) {
      fetchSegments();
    }
  }, [isOpen, effectiveUserId]);

  const fetchSegments = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/get-segments-by-client?clientId=${effectiveUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSegments(data);
      }
    } catch (err) {
      console.error("Error fetching segments:", err);
    }
  };

  const handleCreateSegment = async () => {
    if (!segmentName.trim()) return;
    setSavingSegment(true);

    const contactIds = getContactIds();

    if (contactIds.length === 0) {
      onError("No valid contacts selected. Please select contacts with valid contact IDs.");
      setSavingSegment(false);
      return;
    }

    const segmentData = {
      name: segmentName,
      description: segmentDescription,
      dataFileId: dataFileId ? Number(dataFileId) : null,
      contactIds: contactIds,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/Creat-Segments?ClientId=${effectiveUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(segmentData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create segment");
      }

      onSuccess(`Segment "${segmentName}" created successfully with ${contactIds.length} contacts!`);
      handleClose();
      onContactsCleared();
    } catch (error) {
      console.error("Error creating segment:", error);
      onError("Failed to create segment. Please try again.");
    } finally {
      setSavingSegment(false);
    }
  };

  const handleMoveToExistingSegment = async () => {
    if (!selectedExistingSegment) return;
    setMovingToSegment(true);

    const contactIds = getContactIds();

    if (contactIds.length === 0) {
      onError("No valid contacts selected.");
      setMovingToSegment(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/add-contacts-to-existing-segment?ClientId=${effectiveUserId}&SegmentId=${selectedExistingSegment}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(contactIds),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to move contacts to segment");
      }

      const result = await response.json();
      
      if (result.alreadyPresentCount > 0 && result.contactsAdded === 0) {
        onSuccess(result.message);
      } else if (result.contactsAdded > 0) {
        let message = result.message;
        if (result.alreadyPresentCount > 0) {
          message += ` (${result.contactsAdded} added, ${result.alreadyPresentCount} already present)`;
        }
        onSuccess(message);
      } else {
        onSuccess(result.message || "Contacts moved to segment successfully!");
      }

      handleClose();
      onContactsCleared();
    } catch (error) {
      console.error("Error moving contacts to segment:", error);
      onError("Failed to move contacts to segment. Please try again.");
    } finally {
      setMovingToSegment(false);
    }
  };

  const handleClose = () => {
    setSegmentName("");
    setSegmentDescription("");
    setSelectedExistingSegment("");
    setSegmentModalTab("create");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content popup-modal">
        {/* Tabs at the very top */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => setSegmentModalTab("create")}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom:
                segmentModalTab === "create"
                  ? "2px solid #3f9f42"
                  : "2px solid transparent",
              color: segmentModalTab === "create" ? "#3f9f42" : "#666",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Create new segment
          </button>
          <button
            onClick={() => setSegmentModalTab("move")}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom:
                segmentModalTab === "move"
                  ? "2px solid #3f9f42"
                  : "2px solid transparent",
              color: segmentModalTab === "move" ? "#3f9f42" : "#666",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Copy to existing segment
          </button>
          <span
            onClick={handleClose}
            style={{
              marginLeft: "auto",
              fontSize: "25px",
              fontWeight: 600,
              color: "#9e9e9e",
              cursor: "pointer",
              lineHeight: 1,
              padding: "12px 16px",
            }}
          >
            ×
          </span>
        </div>

        <p style={{ marginRight: "auto", marginBottom: "16px" }}>
          {segmentModalTab === "create" ? "Creating segment" : "Copying"} with{" "}
          {selectedContactsCount} selected contact
          {selectedContactsCount > 1 ? "s" : ""}
        </p>

        {/* Create new segment tab content */}
        {segmentModalTab === "create" && (
          <>
            <div
              style={{
                marginBottom: "16px",
                width: "100%",
                textAlign: "left",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Segment name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Enter segment name"
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
            <div
              style={{
                marginBottom: "20px",
                width: "100%",
                textAlign: "left",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Description
              </label>
              <textarea
                placeholder="Enter description (optional)"
                value={segmentDescription}
                onChange={(e) => setSegmentDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  minHeight: "80px",
                  resize: "vertical",
                }}
                rows={3}
              />
            </div>
          </>
        )}

        {/* Move to existing segment tab content */}
        {segmentModalTab === "move" && (
          <div
            style={{ marginBottom: "20px", width: "100%", textAlign: "left" }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Select segment <span style={{ color: "red" }}>*</span>
            </label>
            <select
              value={selectedExistingSegment}
              onChange={(e) => setSelectedExistingSegment(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              <option value="">Choose a segment</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name} ({segment.contactCount || 0} contacts)
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", marginLeft: "auto" }}>
          <button
            onClick={handleClose}
            style={{
              background: "#fff",
              padding: "8px 16px",
              color: "#666",
              borderRadius: "4px",
              border: "2px solid #ddd",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={
              segmentModalTab === "create"
                ? handleCreateSegment
                : handleMoveToExistingSegment
            }
            disabled={
              segmentModalTab === "create"
                ? !segmentName.trim() || savingSegment
                : !selectedExistingSegment || movingToSegment
            }
            style={{
              background:
                segmentModalTab === "create"
                  ? !segmentName.trim() || savingSegment
                    ? "#ccc"
                    : "#218838"
                  : !selectedExistingSegment || movingToSegment
                  ? "#ccc"
                  : "#218838",
              padding: "8px 16px",
              color: "#fff",
              borderRadius: "4px",
              border: `2px solid ${
                segmentModalTab === "create"
                  ? !segmentName.trim() || savingSegment
                    ? "#ccc"
                    : "#218838"
                  : !selectedExistingSegment || movingToSegment
                  ? "#ccc"
                  : "#218838"
              }`,
              cursor:
                segmentModalTab === "create"
                  ? !segmentName.trim() || savingSegment
                    ? "not-allowed"
                    : "pointer"
                  : !selectedExistingSegment || movingToSegment
                  ? "not-allowed"
                  : "pointer",
              fontSize: "14px",
            }}
          >
            {segmentModalTab === "create"
              ? savingSegment
                ? "Creating..."
                : "Create"
              : movingToSegment
              ? "Copying..."
              : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SegmentModal;
