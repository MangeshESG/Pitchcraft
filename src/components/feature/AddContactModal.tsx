import React, { useState } from 'react';
import API_BASE_URL from '../../config';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataFileId: string;
  onContactAdded: () => void;
  onShowMessage: (message: string, type: 'success' | 'error') => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  dataFileId,
  onContactAdded,
  onShowMessage
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
    companyEventLink: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim() || !formData.email.trim()) {
      onShowMessage('Full name and email are required', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/add-single-contact?DataFileId=${dataFileId}`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add contact');
      }

      onShowMessage('Contact added successfully!', 'success');
      onContactAdded();
      handleClose();
    } catch (error) {
      console.error('Error adding contact:', error);
      onShowMessage('Failed to add contact. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
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
      companyEventLink: '',
      notes: ''
    });
    onClose();
  };

  if (!isOpen) return null;

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
        <h3 style={{ marginTop: 0, marginBottom: 20 }}>Add new contact</h3>
        
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
            
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Company event link
              </label>
              <input
                type="text"
                name="companyEventLink"
                value={formData.companyEventLink}
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
              {isSubmitting ? 'Adding...' : 'Add contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;