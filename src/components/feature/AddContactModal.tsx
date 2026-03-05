import React, { useState } from 'react';
import API_BASE_URL from '../../config';
import CommonSidePanel from '../common/CommonSidePanel';

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
    companyTelephone: '',
    companyEmployeeCount: '',
    companyIndustry: '',
    companyLinkedInURL: '',
    companyEventLink: ''
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
      companyTelephone: '',
      companyEmployeeCount: '',
      companyIndustry: '',
      companyLinkedInURL: '',
      companyEventLink: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <CommonSidePanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Add new contact"
      width={550}
      footerContent={
        <>
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '10px 24px',
              borderRadius: '24px',
              border: '2px solid #ddd',
              background: '#fff',
              color: '#666',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.fullName.trim() || !formData.email.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: '24px',
              border: '2px solid #dc3545',
              background: '#fff',
              color: '#dc3545',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (isSubmitting || !formData.fullName.trim() || !formData.email.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || !formData.fullName.trim() || !formData.email.trim()) ? 0.5 : 1
            }}
          >
            {isSubmitting ? 'Adding...' : 'Add contact'}
          </button>
        </>
      }
    >
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
            
            {/* <div>
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
            </div> */}
          </div>



        </form>
    </CommonSidePanel>
  );
};

export default AddContactModal;