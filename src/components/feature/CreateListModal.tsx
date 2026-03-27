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
  const [isSubmitting, setIsSubmitting] = useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!listName.trim()) {
      onShowMessage('List name is required', 'error');
      return;
    }



    if (!listDescription.trim()) {
      onShowMessage('Description is required', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/Crm/upload-datafile`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId: parseInt(effectiveUserId || '0', 10),
            name: listName.trim(),
            dataFileName: listName.trim(),
            description: listDescription.trim()
          })
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to create list: ${uploadResponse.status}`);
      }

      onShowMessage(`List "${listName}" created successfully!`, 'success');
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <CommonSidePanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Create new list"
      width={400}
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
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                List name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                required
                placeholder="Enter list name"
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
              <textarea
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                rows={4}
                placeholder="Enter description for this list (optional)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        </form>
    </CommonSidePanel>
  );
};

export default CreateListModal;
