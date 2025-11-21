import React, { useState } from 'react';

interface CreateListOptionsProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: () => void;
  onManualCreate: () => void;
}

const CreateListOptions: React.FC<CreateListOptionsProps> = ({
  isOpen,
  onClose,
  onFileUpload,
  onManualCreate
}) => {
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
        padding: 32,
        borderRadius: 12,
        width: '90%',
        maxWidth: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 8, textAlign: 'center' }}>Create a New List</h3>
        <p style={{ marginBottom: 24, color: '#666', textAlign: 'center' }}>
          Choose how you'd like to create your contact list
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            onClick={() => {
              onFileUpload();
              onClose();
            }}
            style={{
              padding: '16px 20px',
              border: '2px solid #3f9f42',
              background: '#3f9f42',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#359a38';
              e.currentTarget.style.borderColor = '#359a38';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#3f9f42';
              e.currentTarget.style.borderColor = '#3f9f42';
            }}
          >
            <span style={{ fontSize: '20px' }}>📁</span>
            Upload Excel/CSV File
          </button>
          
          <button
            onClick={() => {
              onManualCreate();
              onClose();
            }}
            style={{
              padding: '16px 20px',
              border: '2px solid #3f9f42',
              background: '#fff',
              color: '#3f9f42',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f8f9fa';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            <span style={{ fontSize: '20px' }}>✏️</span>
            Add Contacts Manually
          </button>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              background: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateListOptions;