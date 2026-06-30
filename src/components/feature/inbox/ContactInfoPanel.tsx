import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';
import API_BASE_URL from '../../../config';

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

  useEffect(() => {
    if (contactId) {
      fetchContactData();
    } else {
      setContact(null);
      setEditedContact(null);
      setNote(null);
    }
  }, [contactId]);

  const fetchContactData = async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/Crm/get-contact-by-id?contactId=${contactId}`,
        { headers: { accept: '*/*', ...(token && { Authorization: `Bearer ${token}` }) } }
      );
      if (response.data.success && response.data.data) {
        setContact(response.data.data.contact);
        setEditedContact(response.data.data.contact);
        setNote(response.data.data.note);
      }
    } catch (err) {
      console.error('Error fetching contact data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ContactData, value: string) => {
    if (editedContact) setEditedContact({ ...editedContact, [field]: value });
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (!contactId) return null;

  if (loading) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9aa1ab', fontSize: '14px' }}>
        Loading...
      </div>
    );
  }

  if (!contact) return null;

  const displayName = contact.first_name && contact.last_name
    ? `${contact.first_name} ${contact.last_name}`
    : contact.full_name || 'Unknown';

  const clientId = sessionStorage.getItem('clientId') || '';

  return (
    <div style={{ paddingTop: '48px' }}>
      <div style={{ textAlign: 'center', padding: '0 24px 20px', borderBottom: '1px solid #f0f1f3' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3f9f42 0%, #2f7d33 100%)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, margin: '0 auto 14px'
        }}>
          {getInitials(displayName)}
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#1a1d21' }}>
          {displayName}
        </h3>
        <a
          href={`/#/contact-details/${contactId}?tab=Output&clientId=${clientId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#2f7d33', textDecoration: 'none', fontWeight: 600 }}
        >
          Open contact details -&gt;
        </a>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {contact.first_name && contact.last_name ? (
          <>
            <Field label="First name">
              <input value={editedContact?.first_name || ''} onChange={e => handleInputChange('first_name', e.target.value)} />
            </Field>
            <Field label="Last name">
              <input value={editedContact?.last_name || ''} onChange={e => handleInputChange('last_name', e.target.value)} placeholder="Last name" />
            </Field>
          </>
        ) : (
          <Field label="Name">
            <input value={editedContact?.full_name || ''} onChange={e => handleInputChange('full_name', e.target.value)} />
          </Field>
        )}
        <Field label="Company">
          <input value={editedContact?.company_name || ''} onChange={e => handleInputChange('company_name', e.target.value)} placeholder="Company name" />
        </Field>
        <Field label="Email">
          <input type="email" value={editedContact?.email || ''} onChange={e => handleInputChange('email', e.target.value)} />
        </Field>
        <RenderedNote label="Last pinned note" html={note?.note || ''} />
      </div>

      <div style={{ height: 1, background: '#f0f1f3', margin: '0 24px' }} />
    </div>
  );
};

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid #e8eaed',
  borderRadius: 8,
  fontSize: 14,
  color: '#1a1d21',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.5px',
  color: '#9aa1ab',
  marginBottom: 6
};

const Field: React.FC<{ label: string; children: React.ReactElement }> = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    {React.cloneElement(children, {
      style: {
        ...fieldInputStyle,
        ...(children.type === 'textarea' ? { resize: 'vertical', minHeight: 80 } : {}),
      },
      onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = '#3f9f42';
        e.target.style.boxShadow = '0 0 0 3px #eaf5ea';
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = '#e8eaed';
        e.target.style.boxShadow = 'none';
      },
    })}
  </div>
);

const RenderedNote: React.FC<{ label: string; html: string }> = ({ label, html }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={labelStyle}>{label}</label>
    <div
      style={{
        width: '100%',
        minHeight: 80,
        padding: '9px 11px',
        border: '1px solid #e8eaed',
        borderRadius: 8,
        fontSize: 14,
        color: '#1a1d21',
        background: '#fff',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        lineHeight: 1.5,
        overflowWrap: 'break-word'
      }}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(decodeHtml(html) || '<p>No pinned note</p>')
      }}
    />
  </div>
);

const decodeHtml = (value: string): string => {
  if (!value) return '';

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

export default ContactInfoPanel;
