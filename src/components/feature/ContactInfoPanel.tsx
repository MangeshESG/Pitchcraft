import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config';

interface ContactInfoPanelProps {
  contactId: number | null;
  token: string | null;
}

interface ContactData {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  company_name: string;
}

interface NoteData {
  id: number;
  note: string;
}

const ContactInfoPanel: React.FC<ContactInfoPanelProps> = ({ contactId, token }) => {
  const [contact, setContact] = useState<ContactData | null>(null);
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editedContact, setEditedContact] = useState<ContactData | null>(null);
  const [editedNote, setEditedNote] = useState('');

  useEffect(() => {
    if (contactId) {
      fetchContactData();
    }
  }, [contactId]);

  const fetchContactData = async () => {
    if (!contactId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/Crm/get-contact-by-id?contactId=${contactId}`,
        {
          headers: {
            accept: '*/*',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data.success && response.data.data) {
        setContact(response.data.data.contact);
        setEditedContact(response.data.data.contact);
        setNote(response.data.data.note);
        setEditedNote(response.data.data.note?.note || '');
      }
    } catch (err) {
      console.error('Error fetching contact data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ContactData, value: string) => {
    if (editedContact) {
      setEditedContact({ ...editedContact, [field]: value });
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!contactId) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  const displayName = contact.first_name && contact.last_name 
    ? `${contact.first_name} ${contact.last_name}`
    : contact.full_name || 'N/A';

  const initials = getInitials(displayName);

  return (
    <div style={{ padding: '24px', background: '#f9fafb', height: '100%' }}>
      {/* Avatar and Name */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#ffc0cb',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: '600',
          margin: '0 auto 16px'
        }}>
          {initials}
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
          {displayName}
        </h3>
        <a
          href={`/#/contact-details/${contactId}?tab=Output&clientId=${sessionStorage.getItem('clientId') || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '14px',
            color: '#111827',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          Open contact detail page
        </a>
      </div>

      {/* First Name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '11px', 
          fontWeight: '600', 
          color: '#6b7280', 
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          FIRST NAME
        </label>
        {contact.first_name && contact.last_name ? (
          <input
            type="text"
            value={editedContact?.first_name || ''}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              background: '#fff',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          <input
            type="text"
            value={editedContact?.full_name || ''}
            onChange={(e) => handleInputChange('full_name', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              background: '#fff',
              boxSizing: 'border-box'
            }}
          />
        )}
      </div>

      {/* Last Name */}
      {contact.first_name && contact.last_name && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '11px', 
            fontWeight: '600', 
            color: '#6b7280', 
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            LAST NAME
          </label>
          <input
            type="text"
            placeholder="Last name"
            value={editedContact?.last_name || ''}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              background: '#fff',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {/* Company Name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '11px', 
          fontWeight: '600', 
          color: '#6b7280', 
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          COMPANY NAME
        </label>
        <input
          type="text"
          value={editedContact?.company_name || ''}
          onChange={(e) => handleInputChange('company_name', e.target.value)}
          placeholder="Company name"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#111827',
            background: '#fff',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Email */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '11px', 
          fontWeight: '600', 
          color: '#6b7280', 
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          EMAIL
        </label>
        <input
          type="email"
          value={editedContact?.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#111827',
            background: '#fff',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Notes */}
      <div style={{ marginBottom: '16px' }}>
        <textarea
          placeholder="Notes"
          value={editedNote}
          onChange={(e) => setEditedNote(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#111827',
            background: '#fff',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #d1d5db', margin: '24px 0' }} />
    </div>
  );
};

export default ContactInfoPanel;
