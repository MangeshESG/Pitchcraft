import React, { useState } from 'react';
import API_BASE_URL from '../../config';
import { useSelector } from 'react-redux';
import { RootState } from '../../Redux/store';
import CommonSidePanel from '../common/CommonSidePanel';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClient: string;
  onListCreated: () => void;
  onShowMessage: (message: string, type: 'success' | 'error') => void;
}

interface Contact {
  fullName: string;
  email: string;
  website: string;
  companyName: string;
  jobTitle: string;
  linkedInUrl: string;
  countryOrAddress: string;
  companyTelephone: string;
  companyEmployeeCount: string;
  companyIndustry: string;
  companyLinkedInURL: string;
  linkedIninformation?: string;
}

const CreateListModal: React.FC<CreateListModalProps> = ({
  isOpen,
  onClose,
  selectedClient,
  onListCreated,
  onShowMessage
}) => {
  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const effectiveUserId = selectedClient !== "" ? selectedClient : reduxUserId;

  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([{
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
    linkedIninformation: ''
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactChange = (index: number, field: keyof Contact, value: string) => {
    setContacts(prev => prev.map((contact, i) => 
      i === index ? { ...contact, [field]: value } : contact
    ));
  };

  const addContact = () => {
    setContacts(prev => [...prev, {
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
      linkedIninformation: ''
    }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!listName.trim()) {
      onShowMessage('List name is required', 'error');
      return;
    }

    const validContacts = contacts.filter(contact => 
      contact.fullName.trim() && contact.email.trim()
    );

    if (validContacts.length === 0) {
      onShowMessage('At least one contact with name and email is required', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/Crm/uploadcontacts`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId: parseInt(effectiveUserId || '0', 10),
            name: listName.trim(),
            dataFileName: `${listName.trim()}.json`,
            description: listDescription.trim(),
            contacts: validContacts
          })
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to create list: ${uploadResponse.status}`);
      }

      onShowMessage(`List "${listName}" created successfully with ${validContacts.length} contacts!`, 'success');
      onListCreated();
      handleClose();
    } catch (error: any) {
      console.error('Error creating list:', error);
      onShowMessage(error.message || 'Failed to create list. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setListName('');
    setListDescription('');
    setContacts([{
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
      linkedIninformation: ''
    }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <CommonSidePanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Create new list"
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
            disabled={isSubmitting || !listName.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: '24px',
              border: '2px solid #dc3545',
              background: '#fff',
              color: '#dc3545',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (isSubmitting || !listName.trim()) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || !listName.trim()) ? 0.5 : 1
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create list'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24, padding: 16, background: '#f8f9fa', borderRadius: 6 }}>
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>List details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  List name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
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
                  Description
                </label>
                <input
                  type="text"
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0 }}>Contacts</h4>
              <button
                type="button"
                onClick={addContact}
                style={{
                  padding: '10px 24px',
                  background: '#3f9f42',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                + Add contact
              </button>
            </div>

            {contacts.map((contact, index) => (
              <div key={index} style={{ 
                marginBottom: 16, 
                padding: 16, 
                border: '1px solid #e0e0e0', 
                borderRadius: 6,
                background: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h5 style={{ margin: 0 }}>Contact {index + 1}</h5>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      style={{
                        padding: '4px 8px',
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>
                      Full name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={contact.fullName}
                      onChange={(e) => handleContactChange(index, 'fullName', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>
                      Email <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>Company name</label>
                    <input type="text" value={contact.companyName} onChange={(e) => handleContactChange(index, 'companyName', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>Job title</label>
                    <input type="text" value={contact.jobTitle} onChange={(e) => handleContactChange(index, 'jobTitle', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>Website</label>
                    <input type="text" value={contact.website} onChange={(e) => handleContactChange(index, 'website', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>LinkedIn profile</label>
                    <input type="text" value={contact.linkedInUrl} onChange={(e) => handleContactChange(index, 'linkedInUrl', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>Country/address</label>
                    <input type="text" value={contact.countryOrAddress} onChange={(e) => handleContactChange(index, 'countryOrAddress', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>Company telephone</label>
                    <input type="text" value={contact.companyTelephone} onChange={(e) => handleContactChange(index, 'companyTelephone', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>Company employee count</label>
                    <input type="text" value={contact.companyEmployeeCount} onChange={(e) => handleContactChange(index, 'companyEmployeeCount', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>Company industry</label>
                    <input type="text" value={contact.companyIndustry} onChange={(e) => handleContactChange(index, 'companyIndustry', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '14px' }}>LinkedIn summary</label>
                  <textarea value={contact.linkedIninformation} onChange={(e) => handleContactChange(index, 'linkedIninformation', e.target.value)} rows={3} placeholder="Add LinkedIn profile summary or notes..." style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </div>
            ))}
          </div>

        </form>
    </CommonSidePanel>
  );
};

export default CreateListModal;
