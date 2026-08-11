import React, { useState, useEffect } from "react";
import CommonSidePanel from "../common/CommonSidePanel";
import RichTextEditor from "../common/RTEEditor";
import ToastMessage from "../common/ToastMessage";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-regular-svg-icons";
import API_BASE_URL from "../../config";

interface EmailSignatureProps {
  selectedClient: string;
}

interface EmailAccount {
  id: number;
  email: string;
  provider: string;
}

interface Signature {
  id: number;
  clientId: number;
  outboxId: number;
  signatureName: string;
  signatureHtml: string;
  provider: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string | null;
}

const EmailSignature: React.FC<EmailSignatureProps> = ({ selectedClient }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSignatures, setLoadingSignatures] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSignatureId, setEditingSignatureId] = useState<number | null>(null);
  const [signatureActionsAnchor, setSignatureActionsAnchor] = useState<string | null>(null);
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSignatureId, setDeletingSignatureId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    signatureName: "",
    outboxId: "",
    signatureHtml: "",
    isDefault: false,
  });

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');



  // Fetch email accounts when panel opens
  useEffect(() => {
    if (isPanelOpen && selectedClient) {
      fetchEmailAccounts();
    }
  }, [isPanelOpen, selectedClient]);

  // Fetch signatures when component mounts or client changes
  useEffect(() => {
    if (selectedClient) {
      fetchSignatures();
    }
  }, [selectedClient]);

  const fetchEmailAccounts = async () => {
    if (!selectedClient) {
      setToastMessage("Please select a client first");
      setToastType('warning');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }

    setLoading(true);
    try {
      const apiUrl = `${API_BASE_URL}/api/Crm/email-accounts/${selectedClient}`;
      const response = await fetch(apiUrl, {
        headers: { accept: "*/*" },
      });

      if (response.ok) {
        const data = await response.json();
        setEmailAccounts(data || []);
      } else {
        const errorData = await response.json().catch(() => ({ message: `Failed to load email accounts. Status: ${response.status}` }));
        setToastMessage(errorData.message || `Failed to load email accounts. Status: ${response.status}`);
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        setEmailAccounts([]);
      }
    } catch (error: any) {
      setToastMessage(error?.message || "Error loading email accounts");
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      setEmailAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSignatures = async () => {
    if (!selectedClient) return;

    setLoadingSignatures(true);
    try {
      const apiUrl = `${API_BASE_URL}/api/Crm/signatures/${selectedClient}`;
      const response = await fetch(apiUrl, {
        headers: { accept: "*/*" },
      });

      if (response.ok) {
        const data = await response.json();
        setSignatures(data || []);
      } else {
        const errorData = await response.json().catch(() => ({ message: `Failed to load signatures. Status: ${response.status}` }));
        setToastMessage(errorData.message || `Failed to load signatures. Status: ${response.status}`);
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        setSignatures([]);
      }
    } catch (error: any) {
      setToastMessage(error?.message || "Error loading signatures");
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      setSignatures([]);
    } finally {
      setLoadingSignatures(false);
    }
  };

  const handleAddSignature = () => {
    setIsPanelOpen(true);
    setIsEditMode(false);
    setEditingSignatureId(null);
    // Reset form
    setFormData({
      signatureName: "",
      outboxId: "",
      signatureHtml: "",
      isDefault: false,
    });
  };

  const handleEditSignature = (signature: Signature) => {
    setIsPanelOpen(true);
    setIsEditMode(true);
    setEditingSignatureId(signature.id);
    // Populate form with existing data
    setFormData({
      signatureName: signature.signatureName,
      outboxId: signature.outboxId.toString(),
      signatureHtml: signature.signatureHtml,
      isDefault: signature.isDefault,
    });
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleSaveSignature = async () => {
    // Validation
    if (!formData.signatureName.trim()) {
      setToastMessage("Please enter a signature name");
      setToastType('warning');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }
    if (!formData.outboxId) {
      setToastMessage("Please select an email account");
      setToastType('warning');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }
    if (!formData.signatureHtml.trim()) {
      setToastMessage("Please enter signature content");
      setToastType('warning');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }

    setSaving(true);
    try {
      if (isEditMode && editingSignatureId) {
        // Update existing signature
        const payload = {
          id: editingSignatureId,
          signatureName: formData.signatureName,
          signatureHtml: formData.signatureHtml,
          isDefault: formData.isDefault,
        };

        const response = await fetch(
          `${API_BASE_URL}/api/Crm/update-signature`,
          {
            method: "POST",
            headers: {
              accept: "*/*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          setToastMessage(result.message || "Signature updated successfully");
          setToastType('success');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
          handleClosePanel();
          fetchSignatures();
        } else {
          setToastMessage(result.message || "Failed to update signature");
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
        }
      } else {
        // Create new signature
        const selectedAccount = emailAccounts.find(
          (acc) => acc.id.toString() === formData.outboxId
        );

        const payload = {
          clientId: parseInt(selectedClient),
          outboxId: parseInt(formData.outboxId),
          signatureName: formData.signatureName,
          signatureHtml: formData.signatureHtml,
          provider: selectedAccount?.provider || "SMTP",
          isDefault: formData.isDefault,
        };

        const response = await fetch(
          `${API_BASE_URL}/api/Crm/create-signature`,
          {
            method: "POST",
            headers: {
              accept: "*/*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          setToastMessage(result.message || "Signature created successfully");
          setToastType('success');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
          handleClosePanel();
          fetchSignatures();
        } else {
          setToastMessage(result.message || "Failed to create signature");
          setToastType('error');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
        }
      }
    } catch (error: any) {
      console.error("Error saving signature:", error);
      setToastMessage(error?.message || "Error saving signature. Please try again.");
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!deletingSignatureId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/delete-signature?id=${deletingSignatureId}&clientId=${selectedClient}`,
        {
          method: "POST",
          headers: {
            accept: "*/*",
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setToastMessage(result.message || "Signature deleted successfully");
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        fetchSignatures();
      } else {
        setToastMessage(result.message || "Failed to delete signature");
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (error: any) {
      console.error("Error deleting signature:", error);
      setToastMessage(error?.message || "Error deleting signature. Please try again.");
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setShowDeleteModal(false);
      setDeletingSignatureId(null);
    }
  };

  return (
    <div className="email-signature-container">
      <ToastMessage
        show={showToast}
        message={toastMessage}
        type={toastType}
        onClose={() => setShowToast(false)}
        position="bottom-center"
        duration={5}
      />
      <div className="flex justify-between items-center gap-6">
        <p className="text-sm text-gray-600">Manage your email signatures here.</p>
        <button
          onClick={handleAddSignature}
          className="btn-default"
        >
          Add signature
        </button>
      </div>

      {/* Signatures List */}
      <div className="mt-6">
        {loadingSignatures ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3f9f42]"></div>
            <p className="mt-2 text-gray-600">Loading signatures...</p>
          </div>
        ) : signatures.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No signatures found. Create your first signature!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Signature name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Default
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Created at
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {signatures.map((signature) => (
                  <tr key={signature.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{signature.signatureName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {signature.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {signature.isDefault ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(signature.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className="text-sm text-gray-500" 
                        style={{ 
                          maxWidth: '300px',
                          wordWrap: 'break-word'
                        }}
                        dangerouslySetInnerHTML={{ __html: signature.signatureHtml }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ position: 'relative' }}>
                      <button
                        type="button"
                        style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px 8px", fontSize: 20, color: "#374151" }}
                        onClick={() =>
                          setSignatureActionsAnchor(
                            `signature-${signature.id}` === signatureActionsAnchor ? null : `signature-${signature.id}`
                          )
                        }
                      >
                        {"\u22EE"}
                      </button>
                      {signatureActionsAnchor === `signature-${signature.id}` && (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 32,
                            background: "#fff",
                            border: "1px solid #eee",
                            borderRadius: 6,
                            boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
                            zIndex: 101,
                            minWidth: 160,
                            padding: "10px 0"
                          }}
                        >
                          <button
                            onClick={() => {
                              handleEditSignature(signature);
                              setSignatureActionsAnchor(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 16px",
                              border: "none",
                              background: "transparent",
                              textAlign: "left",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 14
                            }}
                            className="hover:bg-gray-50"
                          >
                            <FontAwesomeIcon icon={faEdit} style={{ color: "#3f9f42", fontSize: 20 }} />
                            <span style={{ fontWeight: 600 }}>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeletingSignatureId(signature.id);
                              setShowDeleteModal(true);
                              setSignatureActionsAnchor(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 16px",
                              border: "none",
                              background: "transparent",
                              textAlign: "left",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 14
                            }}
                            className="hover:bg-gray-50"
                          >
                            <FontAwesomeIcon icon={faTrashAlt} style={{ color: "#3f9f42", fontSize: 20 }} />
                            <span style={{ fontWeight: 600 }}>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side Panel */}
      <CommonSidePanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        title={isEditMode ? "Edit email signature" : "Add email signature"}
        width={500}
        footerContent={
          <>
            <button
              onClick={handleClosePanel}
              className="btn-muted"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSignature}
              className="btn-default"
              disabled={saving}
            >
              {saving ? "Saving..." : isEditMode ? "Update signature" : "Save signature"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Signature Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.signatureName}
              onChange={(e) =>
                setFormData({ ...formData, signatureName: e.target.value })
              }
              placeholder="e.g., Professional Signature"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3f9f42]"
            />
          </div>

          {/* Email Account Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email account <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                Loading email accounts...
              </div>
            ) : (
              <select
                value={formData.outboxId}
                onChange={(e) =>
                  setFormData({ ...formData, outboxId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3f9f42]"
                disabled={isEditMode}
              >
                <option value="">Select an email account</option>
                {emailAccounts.length === 0 && !loading ? (
                  <option value="" disabled>
                    No email accounts found
                  </option>
                ) : (
                  emailAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.email}
                    </option>
                  ))
                )}
              </select>
            )}
            {/* {emailAccounts.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {emailAccounts.length} email account(s) found
              </div>
            )} */}
            {isEditMode && (
              <div className="text-xs text-gray-500 mt-1">
                Email account cannot be changed while editing
              </div>
            )}
          </div>

          {/* Signature Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Signature content <span className="text-red-500">*</span>
            </label>
            <style>
              {`
                .signature-editor .rich-text-editor > div {
                  min-height: 100px !important;
                  max-height: 200px !important;
                }
              `}
            </style>
            <div className="signature-editor">
              <RichTextEditor 
                value={formData.signatureHtml} 
                onChange={(value) => setFormData({ ...formData, signatureHtml: value })}
              />
            </div>
          </div>

          {/* Is Default Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              className="h-4 w-4 text-[#3f9f42] focus:ring-[#3f9f42] border-gray-300 rounded"
            />
            <label
              htmlFor="isDefault"
              className="ml-2 block text-sm text-gray-700"
            >
              Set as default signature
            </label>
          </div>
        </div>
      </CommonSidePanel>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        deleteMode="Permanent"
        count={1}
        itemName="signature"
        locationLabel="email signatures"
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingSignatureId(null);
        }}
        onConfirm={handleDeleteSignature}
      />
    </div>
  );
};

export default EmailSignature;
