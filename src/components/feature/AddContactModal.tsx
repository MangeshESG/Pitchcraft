import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import CommonSidePanel from '../common/CommonSidePanel';

interface DataFile {
  id: number | string | null;
  client_id: number;
  name: string;
  data_file_name: string;
  description: string;
  created_at: string;
  updated_at: string | null;
  contactCount: number;
}

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataFileId?: string;
  isFromAllContacts?: boolean;
  onContactAdded: () => void;
  onShowMessage: (message: string, type: 'success' | 'error') => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  dataFileId,
  isFromAllContacts = false,
  onContactAdded,
  onShowMessage
}) => {
  // Get client ID from session storage like EmailCampaignBuilder does
  const clientId = sessionStorage.getItem("clientId");
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
    companyEventLink: '',
    linkedIninformation: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataFiles, setDataFiles] = useState<DataFile[]>([]);
  const [selectedDataFileId, setSelectedDataFileId] = useState<number | string | null>(null);
  const [showDataFileDropdown, setShowDataFileDropdown] = useState(false);

  // Fetch data files
  useEffect(() => {
    const fetchDataFiles = async () => {
      try {
        const response = await fetch('https://localhost:7216/api/Crm/datafile-byclientid?clientId=' + clientId);
        if (response.ok) {
          const files = await response.json();
          
          // Add "Select file" option at the beginning
          const filesWithNoSelection = [
            {
              id: 'no-file',
              client_id: parseInt(clientId || '0'),
              name: "Select file",
              data_file_name: "no_file",
              description: "Don't associate with any data file",
              created_at: new Date().toISOString(),
              updated_at: null,
              contactCount: 0
            },
            ...files
          ];
          
          setDataFiles(filesWithNoSelection);
          
          // Set default selection based on context
          if (isFromAllContacts) {
            // When from "All contacts", prefer "All manually added contacts" if it exists
            const manualContactsFile = files.find((file: DataFile) => 
              file.name === "All manually added contacts"
            );
            if (manualContactsFile) {
              setSelectedDataFileId(manualContactsFile.id);
            } else {
              // If no manual contacts file, select "Select file"
              setSelectedDataFileId('no-file');
            }
          } else if (dataFileId) {
            // When from specific file, select that file
            setSelectedDataFileId(parseInt(dataFileId));
          } else {
            // Default case - select "Select file"
            setSelectedDataFileId('no-file');
          }
        }
      } catch (error) {
        console.error('Error fetching data files:', error);
      }
    };
    if (isOpen) {
      fetchDataFiles();
    }
  }, [isOpen, dataFileId, isFromAllContacts, clientId]);

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

    if (!selectedDataFileId) {
      onShowMessage('Please select a data file', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check if selected file is "All manually added contacts" or "Select file"
      const selectedFile = dataFiles.find(f => f.id === selectedDataFileId);
      const isManualContacts = selectedFile?.name === "All manually added contacts";
      const isNoFileSelected = selectedFile?.name === "Select file";
      
      // Send null for manual contacts or select file, otherwise send the actual ID
      const dataFileIdToSend = (isManualContacts || isNoFileSelected) ? null : selectedDataFileId;
      
      // Prepare request body with clientId
      const requestBody = {
        fullName: formData.fullName,
        email: formData.email,
        website: formData.website,
        companyName: formData.companyName,
        jobTitle: formData.jobTitle,
        linkedInUrl: formData.linkedInUrl,
        countryOrAddress: formData.countryOrAddress,
        emailSubject: '',
        emailBody: '',
        companyTelephone: formData.companyTelephone,
        companyEmployeeCount: formData.companyEmployeeCount,
        companyIndustry: formData.companyIndustry,
        companyLinkedInURL: formData.companyLinkedInURL,
        linkedIninformation: formData.linkedIninformation,
        clientId: parseInt(clientId || '0'),
        customFields: {}
      };
      
      // Debug logs
      console.log('Client ID received:', clientId);
      console.log('Request body:', requestBody);
      console.log('DataFileId to send:', dataFileIdToSend);
      
      // Construct URL with DataFileId if needed
      let apiUrl = `${API_BASE_URL}/api/Crm/add-single-contact`;
      if (dataFileIdToSend) {
        apiUrl += `?DataFileId=${dataFileIdToSend}`;
      }
      
      console.log('API URL:', apiUrl);
      
      const response = await fetch(
        apiUrl,
        {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
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
      companyEventLink: '',
      linkedIninformation: ''
    });
    setSelectedDataFileId(null);
    setShowDataFileDropdown(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <CommonSidePanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Add new contact in"
      width={550}
      headerContent={
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDataFileDropdown(!showDataFileDropdown)}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              padding: '8px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              minWidth: '220px',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              color: '#2d3748',
              fontWeight: '500',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
              e.currentTarget.style.borderColor = '#cbd5e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <span style={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '170px'
            }}>
              {selectedDataFileId !== null
                ? dataFiles.find(f => f.id === selectedDataFileId)?.name || 'Select Data File'
                : dataFiles.find(f => f.id === null)?.name || 'Select Data File'
              }
            </span>
            <span style={{ 
              fontSize: '12px',
              marginLeft: '8px',
              transform: showDataFileDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}>▼</span>
          </button>
          {showDataFileDropdown && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: '#fff',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
              zIndex: 1001,
              maxHeight: '280px',
              overflowY: 'auto',
              animation: 'slideDown 0.2s ease-out'
            }}>
              <div style={{
                padding: '8px 0'
              }}>
                {dataFiles.map((file, index) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedDataFileId(file.id);
                      setShowDataFileDropdown(false);
                    }}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: index < dataFiles.length - 1 ? '1px solid #f0f0f0' : 'none',
                      backgroundColor: selectedDataFileId === file.id ? '#f8f9ff' : 'transparent',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedDataFileId !== file.id) {
                        e.currentTarget.style.backgroundColor = '#f5f7fa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = selectedDataFileId === file.id ? '#f8f9ff' : 'transparent';
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '13px',
                          color: '#2d3748',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {file.name}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#718096',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span style={{
                            display: 'inline-block',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 
                              file.name === "Select file" ? '#e53e3e' : 
                              file.name === "All manually added contacts" ? '#ed8936' : 
                              '#48bb78'
                          }}></span>
                          {file.name === "Select file" ? 'No data file' : 
                           file.name === "All manually added contacts" ? 'Manual contacts' : 
                           `${file.contactCount} contacts`}
                        </div>
                      </div>
                      {selectedDataFileId === file.id && (
                        <div style={{
                          color: '#667eea',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <style>
            {`
              @keyframes slideDown {
                from {
                  opacity: 0;
                  transform: translateY(-8px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}
          </style>
        </div>
      }
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
            disabled={isSubmitting || !formData.fullName.trim() || !formData.email.trim() || !selectedDataFileId}
            style={{
              padding: '10px 24px',
              borderRadius: '24px',
              border: '2px solid #dc3545',
              background: '#fff',
              color: '#dc3545',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (isSubmitting || !formData.fullName.trim() || !formData.email.trim() || !selectedDataFileId) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || !formData.fullName.trim() || !formData.email.trim() || !selectedDataFileId) ? 0.5 : 1
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
            
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              LinkedIn summary
            </label>
            <textarea
              name="linkedIninformation"
              value={formData.linkedIninformation}
              onChange={handleInputChange}
              placeholder="Add LinkedIn profile summary or notes..."
              rows={4}
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
        </form>
    </CommonSidePanel>
  );
};

export default AddContactModal;