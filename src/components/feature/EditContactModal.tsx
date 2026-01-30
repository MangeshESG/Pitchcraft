import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';

interface Contact {
  id: number;
  full_name: string;
  email: string;
  website?: string;
  company_name?: string;
  job_title?: string;
  linkedin_url?: string;
  country_or_address?: string;
  email_subject?: string;
  email_body?: string;
  companyTelephone?: string;
  companyEmployeeCount?: string;
  companyIndustry?: string;
  companyLinkedInURL?: string;
  notes?: string;
}

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onContactUpdated: (updatedContact: Contact) => void;
  onShowMessage: (message: string, type: 'success' | 'error') => void;
  hideOverlay?: boolean;
  asPage?: boolean;
}

const EditContactModal: React.FC<EditContactModalProps> = ({
  isOpen,
  onClose,
  contact,
  onContactUpdated,
  onShowMessage,
  hideOverlay = false,
  asPage = false
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    website: '',
    companyName: '',
    jobTitle: '',
    linkedInUrl: '',
    countryOrAddress: '',
    emailSubject: '',
    emailBody: '',
    companyTelephone: '',
    companyEmployeeCount: '',
    companyIndustry: '',
    companyLinkedInURL: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailBodyPopup, setShowEmailBodyPopup] = useState(false);
  const [showNotesPopup, setShowNotesPopup] = useState(false);


  useEffect(() => {
    if (contact) {
      setFormData(prev => ({
    ...prev,
        fullName: contact.full_name || '',
        email: contact.email || '',
        website: contact.website || '',
        companyName: contact.company_name || '',
        jobTitle: contact.job_title || '',
        linkedInUrl: contact.linkedin_url || '',
        countryOrAddress: contact.country_or_address || '',
        emailSubject: contact.email_subject || '',
        emailBody: stripHtml(contact.email_body || ''),
        //emailBody: contact.email_body || '',
        companyTelephone: contact.companyTelephone || '',
        companyEmployeeCount: contact.companyEmployeeCount || '',
        companyIndustry: contact.companyIndustry || '',
        companyLinkedInURL: contact.companyLinkedInURL || '',
        notes: contact.notes ?? prev.notes
       }));
    }
      console.log("Contact received:", contact);
  }, [contact]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const stripHtml = (html: string): string => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };
  // const inputStyle =
  //   "w-full h-10 px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-bg-[#3f9f42]-200 focus:ring-bg-[#3f9f42]-200 focus:border-green-00 transition-colors placeholder-gray-400"
  const labelStyle = "block text-sm font-semibold text-gray-700 mb-2.5"
  const wideInputStyle =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3f9f42]";
  const inputStyle =
    "w-full max-w-[19rem] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3f9f42]";

  const sectionTitleStyle =
    "text-xs font-bold text-gray-600 uppercase tracking-widest mb-5 mt-7 first:mt-0 pb-3 border-b border-gray-200"
  const dividerStyle = "h-px bg-gray-200 my-7"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim()) {
      onShowMessage('Full name and email are required', 'error');
      return;
    }

    if (!contact?.id) {
      onShowMessage('Contact ID is missing', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/update-contact?id=${contact.id}`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json'
          },
          // body: JSON.stringify(formData)
          body: JSON.stringify({
            ...formData,
            emailBody: stripHtml(formData.emailBody),
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }
        // const updatedContact = await response.json();
      onShowMessage('Contact updated successfully!', 'success');
      //onContactUpdated(updatedContact);
      await response.json()
      const updatedContact: Contact = {
  ...contact,
  full_name: formData.fullName,
  email: formData.email,
  website: formData.website,
  company_name: formData.companyName,
  job_title: formData.jobTitle,
  linkedin_url: formData.linkedInUrl,
  country_or_address: formData.countryOrAddress,
  email_subject: formData.emailSubject,
  email_body: formData.emailBody,
  companyTelephone: formData.companyTelephone,
  companyEmployeeCount: formData.companyEmployeeCount,
  companyIndustry: formData.companyIndustry,
  companyLinkedInURL: formData.companyLinkedInURL,
  notes: formData.notes, // 🔥 THIS WAS MISSING
};

onContactUpdated(updatedContact);
      handleClose();
    } catch (error) {
      console.error('Error updating contact:', error);
      onShowMessage('Failed to update contact. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };
 


  if (!isOpen || !contact) return null;
  const content = (
    <div className={`${asPage ? "w-full" : "w-[45%] max-w-3xl"} ${!asPage && "shadow-xl rounded-lg"}`}>
      <div className={`${asPage ? "" : "bg-white rounded-lg"} p-8`}>
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Edit contact</h1>
          <p className="text-sm text-gray-500 mt-2">Update contact information and details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* PERSONAL INFORMATION */}
          <div>
            <h2 className={sectionTitleStyle}>Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-4">
              <div>
                <label className={labelStyle}>
                  Full name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName || ""}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter full name"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>
                  Email <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter email address"
                  className={inputStyle}
                />
              </div>
            </div>
          </div>

          <div className={dividerStyle} />

          {/* PROFESSIONAL INFORMATION */}
          <div>
            <h2 className={sectionTitleStyle}>Professional Information</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-4">
                <div>
                  <label className={labelStyle}>Job title</label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., Software Developer"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Company name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName || ""}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Company industry</label>
                  <input
                    type="text"
                    name="companyIndustry"
                    value={formData.companyIndustry || ""}
                    onChange={handleInputChange}
                    className={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-4">
                <div>
                  <label className={labelStyle}>Company employee count</label>
                  <input
                    type="text"
                    name="companyEmployeeCount"
                    value={formData.companyEmployeeCount || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., 50-100"
                    className={inputStyle}
                  />
                </div>
              {/* </div> */}

              {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-5"> */}
                <div>
                  <label className={labelStyle}>Company telephone</label>
                  <input
                    type="text"
                    name="companyTelephone"
                    value={formData.companyTelephone || ""}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>Country/address</label>
                  <input
                    type="text"
                    name="countryOrAddress"
                    value={formData.countryOrAddress || ""}
                    onChange={handleInputChange}
                    placeholder="Enter location"
                    className={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={dividerStyle} />

          {/* CONTACT & SOCIAL */}
          <div>
            <h2 className={sectionTitleStyle}>Contact & Social</h2>
            {/* <div className="space-y-5"> */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-4">
                <div>
                  <label className={labelStyle}>Website</label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website || ""}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                    className={inputStyle}
                  />
                </div>

                <div>
                  <label className={labelStyle}>LinkedIn URL</label>
                  <input
                    type="text"
                    name="linkedInUrl"
                    value={formData.linkedInUrl || ""}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/..."
                    className={inputStyle}
                  />
                </div>
                <div>
                <label className={labelStyle}>Company LinkedIn URL</label>
                <input
                  type="text"
                  name="companyLinkedInURL"
                  value={formData.companyLinkedInURL || ""}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/company/..."
                  className={inputStyle}
                />
              </div>
              </div>
            {/* </div> */}
          </div>

          <div className={dividerStyle} />
          {/* NOTES */}
          <div>
            <h2 className={sectionTitleStyle}>Additional Information</h2>
            <label className={labelStyle}>Notes</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {console.log("Expand notes clicked");setShowNotesPopup(true)}}
                title="Expand notes"
                className="absolute top-3.5 right-3.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors z-10 p-1.5 text-gray-600"
              >
                ⤢
              </button>

              <textarea
                name="notes"
                value={formData.notes || ""}
                onChange={handleInputChange}
                rows={6}
                placeholder="Add internal notes about this contact"
                className={`${wideInputStyle} resize-none py-2.5`}
              />
            </div>
          </div>

          <div className={dividerStyle} />
          {/* EMAIL CONTENT */}
          <div>
            <h2 className={sectionTitleStyle}>Email Content</h2>
            <div className="space-y-5">
              <div>
                <label className={labelStyle}>Email subject</label>
                <input
                  type="text"
                  name="emailSubject"
                  value={formData.emailSubject || ""}
                  onChange={handleInputChange}
                  placeholder="Enter email subject"
                  className={wideInputStyle}
                  style={{width:"70%"}}
                />
              </div>

              <div>
                <label className={labelStyle}>Email body</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmailBodyPopup(true)}
                    title="Expand email body in fullscreen"
                    className="absolute top-3.5 right-3.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors z-10 p-1.5 text-gray-600"
                  >
                    ⤢
                  </button>
                  <textarea
                    name="emailBody"
                    value={formData.emailBody || ""}
                    onChange={handleInputChange}
                    rows={8}
                    placeholder="Enter email body"
                    className={`${wideInputStyle} resize-none h-auto py-2.5`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={dividerStyle} />
          {/* Buttons for form submission */}
          <div className="flex justify-end gap-4 pt-4 mt-8 border-t border-gray-200">
            <button
              type="button"
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.fullName?.trim() || !formData.email?.trim()}
              className="px-5 py-2.5 bg-[#3f9f42] text-white rounded-md font-medium hover:bg-[#3f9f42] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Updating..." : "Update contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  
  if (asPage) {
    return (
      <>
        {content}

        {showEmailBodyPopup && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 100000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 24,
                borderRadius: 8,
                width: "70%",
                maxWidth: 900,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>
                Email body
              </h3>

              <textarea
                value={formData.emailBody}
                readOnly
                rows={12}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  resize: "vertical",
                  background: "#f9f9f9",
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowEmailBodyPopup(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#3f9f42",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
         {
    showNotesPopup && (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Notes</h3>
            <button
              onClick={() => setShowNotesPopup(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <textarea
            name="notes"
            value={formData.notes || ""}
            onChange={handleInputChange}
            rows={15}
            className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#3f9f42]"
          />
        </div>
      </div>
    )
  }
      </>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      zIndex: 99999,
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 8,
        width: '45%',
        maxWidth: 800,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>Edit contact</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Full name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Email <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company name
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Job title
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Website
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                LinkedIn URL
              </label>
              <input
                type="text"
                name="linkedInUrl"
                value={formData.linkedInUrl}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Country/address
              </label>
              <input
                type="text"
                name="countryOrAddress"
                value={formData.countryOrAddress}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company telephone
              </label>
              <input
                type="text"
                name="companyTelephone"
                value={formData.companyTelephone}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company employee count
              </label>
              <input
                type="text"
                name="companyEmployeeCount"
                value={formData.companyEmployeeCount}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company industry
              </label>
              <input
                type="text"
                name="companyIndustry"
                value={formData.companyIndustry}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company linkedin URL
              </label>
              <input
                type="text"
                name="companyLinkedInURL"
                value={formData.companyLinkedInURL}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Email subject
            </label>
            <input
              type="text"
              name="emailSubject"
              value={formData.emailSubject}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Email body
            </label>
            <textarea
              name="emailBody"
              value={formData.emailBody}
              onChange={handleInputChange}
              rows={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                background: '#fff',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.fullName.trim() || !formData.email.trim()}
              style={{
                padding: '8px 16px',
                background: isSubmitting || !formData.fullName.trim() || !formData.email.trim() ? '#ccc' : '#3f9f42',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting || !formData.fullName.trim() || !formData.email.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Updating...' : 'Update contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContactModal;
