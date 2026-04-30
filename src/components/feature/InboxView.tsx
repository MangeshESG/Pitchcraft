import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config';
import LoadingSpinner from '../common/LoadingSpinner';
import RichTextEditor from '../common/RTEEditor';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { copyToClipboard } from '../../utils/utils';
import Modal from '../common/Modal';
import './InboxView.css';

interface InboxDropdownItem {
  inboxId: number;
  emailAddress: string;
  provider: string;
}

interface BlueprintTemplate {
  id: number;
  templateDefinitionId: number;
  templateName: string;
  templateDefinitionName: string;
  createdAt: string;
  updatedAt: string | null;
  selectedModel: string;
  hasConversation: boolean;
}

interface InboxMessage {
  type: string;
  messageId: string;
  subject: string;
  body: string;
  fromEmail: string;
  toEmail: string;
  date: string;
  isRead: boolean;
  contactId: number | null;
}

interface InboxThread {
  trackingId: string;
  subject: string;
  contactEmail: string;
  totalMessages: number;
  lastMessageDate: string;
  hasUnread: boolean;
  contactId: number | null;
  messages: InboxMessage[];
}

interface InboxViewProps {
  effectiveUserId: string;
  token: string | null;
  isVisible: boolean;
}

const InboxView: React.FC<InboxViewProps> = ({ effectiveUserId, token, isVisible }) => {
  const [inboxList, setInboxList] = useState<InboxDropdownItem[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<InboxThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [replyText, setReplyText] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [blueprints, setBlueprints] = useState<BlueprintTemplate[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<number | null>(null);
  const [isKrafting, setIsKrafting] = useState(false);
  const [isCopyText, setIsCopyText] = useState(false);
  const [openDeviceDropdown, setOpenDeviceDropdown] = useState(false);
  const [outputEmailWidth, setOutputEmailWidth] = useState<string>('');
  const [openModals, setOpenModals] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchInboxList = async () => {
      if (!effectiveUserId || !isVisible) return;
      
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Inbox/Inbox_dropdown?clientId=${effectiveUserId}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (response.data.success && response.data.data) {
          setInboxList(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching inbox list:', err);
        setError('Failed to load inbox list');
      } finally {
        setLoading(false);
      }
    };

    fetchInboxList();
  }, [effectiveUserId, token, isVisible]);

  useEffect(() => {
    const fetchBlueprints = async () => {
      if (!effectiveUserId || !isVisible) return;
      
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/CampaignPrompt/templates/${effectiveUserId}?pageSize=20&pageNumber=1`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (response.data.templates) {
          setBlueprints(response.data.templates);
        }
      } catch (err) {
        console.error('Error fetching blueprints:', err);
      }
    };

    fetchBlueprints();
  }, [effectiveUserId, token, isVisible]);

  useEffect(() => {
    const fetchMails = async () => {
      if (!selectedInboxId || !isVisible) return;

      setLoading(true);
      setError('');
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Inbox/inbox?inboxId=${selectedInboxId}&Provider=${selectedProvider}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (response.data.success && response.data.data) {
          setThreads(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching mails:', err);
        setError('Failed to load emails');
      } finally {
        setLoading(false);
      }
    };

    fetchMails();
  }, [selectedInboxId, selectedProvider, token, isVisible]);

  const handleInboxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const inboxId = parseInt(e.target.value);
    const inbox = inboxList.find(i => i.inboxId === inboxId);
    setSelectedInboxId(inboxId);
    setSelectedProvider(inbox?.provider || '');
    setSelectedThread(null);
  };

  const handleThreadClick = async (thread: InboxThread) => {
    setSelectedThread(thread);
    
    // Mark thread as read
    if (thread.hasUnread) {
      try {
        // Mark all unread messages in the thread as read
        const unreadMessages = thread.messages.filter(msg => !msg.isRead);
        for (const message of unreadMessages) {
          await axios.post(
            `${API_BASE_URL}/api/Inbox/mark-read?id=${message.messageId}`,
            {},
            {
              headers: {
                accept: '*/*',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );
        }
        
        // Update thread state to mark as read
        setThreads(prevThreads => 
          prevThreads.map(t => 
            t.trackingId === thread.trackingId 
              ? { ...t, hasUnread: false, messages: t.messages.map(m => ({ ...m, isRead: true })) }
              : t
          )
        );
      } catch (err) {
        console.error('Error marking thread as read:', err);
      }
    }
  };

  const handleBackToList = () => {
    setSelectedThread(null);
    setReplyText('');
  };

  const handleKraftEmail = async () => {
    if (!selectedBlueprint || !selectedThread) return;
    
    setIsKrafting(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/CampaignPrompt/campaign/generate-single-contact`,
        {
          blueprintId: selectedBlueprint,
          contactId: selectedThread.contactId,
          clientId: effectiveUserId,
          overwriteExisting: true
        },
        {
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data.success && response.data.emailBody) {
        setReplyText(response.data.emailBody);
      } else {
        setError('Failed to generate email');
      }
    } catch (err: any) {
      console.error('Error krafting email:', err);
      setError(err.response?.data?.message || 'Failed to generate email');
    } finally {
      setIsKrafting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    
    setIsSending(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/email/reply_email`,
        {
          trackingId: selectedThread.trackingId,
          clientId: parseInt(effectiveUserId),
          replyBody: replyText,
          outboxId: selectedInboxId,
          bccEmail: '',
          Provider: selectedProvider
        },                          
        {
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data.success) {
        setReplyText('');
        // Refresh the thread to show the new reply
        const refreshResponse = await axios.get(
          `${API_BASE_URL}/api/Inbox/inbox?inboxId=${selectedInboxId}&Provider=${selectedProvider}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        
        if (refreshResponse.data.success && refreshResponse.data.data) {
          setThreads(refreshResponse.data.data);
          // Update selected thread with new data
          const updatedThread = refreshResponse.data.data.find(
            (t: InboxThread) => t.trackingId === selectedThread.trackingId
          );
          if (updatedThread) {
            setSelectedThread(updatedThread);
          }
        }
      } else {
        setError('Failed to send reply');
      }
    } catch (err: any) {
      console.error('Error sending reply:', err);
      setError(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const extractEmailAddress = (emailString: string): string => {
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString;
  };

  const extractSenderName = (emailString: string): string => {
    const match = emailString.match(/^"?(.+?)"?\s*</);
    if (match) {
      return match[1].replace(/"/g, '').trim();
    }
    const email = extractEmailAddress(emailString);
    return email.split('@')[0];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTimeGroup = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays < 7) return 'Last Week';
    return 'Older';
  };

  const groupedThreads = threads.reduce((acc, thread) => {
    const group = getTimeGroup(thread.lastMessageDate);
    if (!acc[group]) acc[group] = [];
    acc[group].push(thread);
    return acc;
  }, {} as Record<string, InboxThread[]>);

  // Sort groups to show Today first, then Last Week, then Older
  const sortedGroups = Object.entries(groupedThreads).sort(([groupA], [groupB]) => {
    const order = { 'Today': 0, 'Last Week': 1, 'Older': 2 };
    return order[groupA as keyof typeof order] - order[groupB as keyof typeof order];
  });

  const getInitials = (email: string): string => {
    const name = extractSenderName(email);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  };

  const formatEmailBody = (body: string): string => {
    // Decode HTML entities
    let formatted = body
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    return formatted;
  };

  const copyToClipboardHandler = async () => {
    const contentToCopy = replyText || '';
    if (contentToCopy) {
      try {
        const copied = await copyToClipboard(contentToCopy);
        setIsCopyText(copied);
        setTimeout(() => {
          setIsCopyText(false);
        }, 1000);
      } catch (err) {
        console.error('Error copying text:', err);
      }
    }
  };

  const toggleOutputEmailWidth = (deviceName: string) => {
    setOutputEmailWidth(deviceName);
    setOpenDeviceDropdown(false);
  };

  const handleModalOpen = (id: string) => {
    setOpenModals((prev) => ({ ...prev, [id]: true }));
  };

  const handleModalClose = (id: string) => {
    setOpenModals((prev) => ({ ...prev, [id]: false }));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="dashboard-section" style={{ display: isVisible ? 'block' : 'none', marginTop: '-60px' }}>
      <p>
        View and manage your inbox emails with sender information and full message content.
      </p>

      {/* Inbox Selection */}
      <div className="form-controls">
        <div className="form-group">
          <label>
            Select Inbox <span style={{ color: 'red' }}>*</span>
          </label>
          <select
            value={selectedInboxId || ''}
            onChange={handleInboxChange}
            disabled={loading || inboxList.length === 0}
            className={!selectedInboxId ? 'error' : ''}
          >
            <option value="">Choose an inbox</option>
            {inboxList.map((inbox) => (
              <option key={inbox.inboxId} value={inbox.inboxId}>
                {inbox.emailAddress || `Inbox ${inbox.inboxId}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <LoadingSpinner message="Loading..." />}

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#f8d7da',
          border: '1px solid #dc3545',
          borderRadius: 6,
          marginTop: 16,
          color: '#721c24'
        }}>
          {error}
        </div>
      )}

      {/* Email Content */}
      {selectedInboxId && !loading && !error && (
        <div className="inbox-content">
          {!selectedThread ? (
            <div className="mail-list mail-list-fullwidth">
            {threads.length === 0 ? (
              <div className="no-mails">No emails found</div>
            ) : (
              sortedGroups.map(([group, groupThreads]) => (
                <div key={group}>
                  <div className="mail-group-header">{group}</div>
                  {groupThreads.map((thread) => {
                    const lastMessage = thread.messages[thread.messages.length - 1];
                    return (
                      <div
                        key={thread.trackingId}
                        className={`mail-item ${thread.hasUnread ? 'unread' : ''}`}
                        onClick={() => handleThreadClick(thread)}
                      >
                        <div className="mail-avatar">{getInitials(thread.contactEmail)}</div>
                        <div className="mail-content">
                          <div className="mail-item-header">
                            <span className="mail-sender">{extractSenderName(thread.contactEmail)}</span>
                            <span className="mail-date">{formatDate(thread.lastMessageDate)}</span>
                          </div>
                          <div className="mail-subject">
                            {thread.totalMessages > 1 && <span className="reply-icon">↩ {thread.totalMessages}</span>}
                            {thread.subject}
                          </div>
                          <div className="mail-preview">
                            {lastMessage.body
                              .replace(/<[^>]*>/g, '')
                              .replace(/&gt;/g, '>')
                              .replace(/&lt;/g, '<')
                              .replace(/&amp;/g, '&')
                              .replace(/&quot;/g, '"')
                              .replace(/&#39;/g, "'")
                              .replace(/\s+/g, ' ')
                              .trim()
                              .substring(0, 100)}{lastMessage.body.length > 100 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            </div>
          ) : (
            <div className="mail-detail mail-detail-fullwidth">
              <button className="back-button" onClick={handleBackToList}>
                ← Back to Inbox
              </button>
              <h3 className="mail-detail-subject" style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>{selectedThread.subject}</h3>
              
              {selectedThread.messages.map((message, index) => {
                const messageContactId = message.type === 'Reply' ? message.contactId : null;
                console.log('Message type:', message.type, 'contactId:', messageContactId);
                return (
                <div key={message.messageId} style={{ marginBottom: index < selectedThread.messages.length - 1 ? '24px' : '0', paddingBottom: index < selectedThread.messages.length - 1 ? '24px' : '0', borderBottom: index < selectedThread.messages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <div className="mail-detail-header">
                    <div className="mail-detail-top">
                      <div className="mail-detail-avatar">{getInitials(message.fromEmail)}</div>
                      <div className="mail-detail-info">
                        <div 
                          className="mail-detail-sender"
                          style={{
                            cursor: messageContactId ? 'pointer' : 'default',
                            color: messageContactId ? '#3f9f42' : 'inherit',
                            textDecoration: messageContactId ? 'underline' : 'none'
                          }}
                          onClick={(e) => {
                            if (messageContactId) {
                              e.stopPropagation();
                              const clientId = sessionStorage.getItem('clientId') || '';
                              const contactDetailsUrl = `/#/contact-details/${messageContactId}?tab=Output&clientId=${clientId}`;
                              window.open(contactDetailsUrl, '_blank');
                            }
                          }}
                        >
                          {extractSenderName(message.fromEmail)}
                        </div>
                        <div className="mail-detail-to">
                          {extractEmailAddress(message.fromEmail)}
                        </div>
                      </div>
                      <div className="mail-detail-date">{new Date(message.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                    </div>
                  </div>
                  <div className="mail-body" dangerouslySetInnerHTML={{ __html: formatEmailBody(message.body) }} style={{ maxWidth: '100%', overflowX: 'auto' }} />
                </div>
              );})}
              
              {/* Reply Section */}
              <div className="reply-section" style={{
                marginTop: '24px',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontWeight: '500', fontSize: '14px', color: '#374151' }}>Write Reply</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={selectedBlueprint || ''}
                      onChange={(e) => setSelectedBlueprint(e.target.value ? parseInt(e.target.value) : null)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        minWidth: '200px'
                      }}
                    >
                      <option value="">Select Blueprint</option>
                      {blueprints.map((blueprint) => (
                        <option key={blueprint.id} value={blueprint.id}>
                          {blueprint.templateName}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleKraftEmail}
                      disabled={!selectedBlueprint || isKrafting}
                      style={{
                        padding: '6px 16px',
                        background: (!selectedBlueprint || isKrafting) ? '#ccc' : '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (!selectedBlueprint || isKrafting) ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isKrafting ? 'Krafting...' : 'Kraft'}
                    </button>
                  </div>
                </div>
                <style>
                  {`
                    .reply-section .rich-text-editor > div {
                      min-height: 30px !important;
                      max-height: 100px !important;
                    }
                  `}
                </style>
                <div style={{ marginBottom: '12px', position: 'relative' }}>
                  <div style={{ 
                    maxWidth: `${outputEmailWidth === 'Mobile' ? '480px' : outputEmailWidth === 'Tab' ? '768px' : '100%'}`,
                    margin: '0 auto'
                  }}>
                    <RichTextEditor 
                      value={replyText} 
                      onChange={setReplyText}
                      showActionButtons={false}
                      outputEmailWidth={outputEmailWidth}
                      isCopyText={isCopyText}
                      openDeviceDropdown={openDeviceDropdown}
                      onDeviceDropdownToggle={() => setOpenDeviceDropdown(!openDeviceDropdown)}
                      onDeviceWidthChange={(width) => {
                        setOutputEmailWidth(width);
                        setOpenDeviceDropdown(false);
                      }}
                      onCopyToClipboard={copyToClipboardHandler}
                      onExpandEditor={() => handleModalOpen('modal-reply-expand')}
                    />
                  </div>
                  
                  {/* Toolbar - Same as Output.tsx */}
                  <div className="output-email-floated-icons d-flex bg-[#ffffff] rounded-md" style={{ position: 'absolute', right: '10px', top: '10px', zIndex: 10 }}>
                    <div className="d-flex align-items-center justify-between flex-col-991">
                      <div className="d-flex relative">
                        <button
                          onClick={() => setOpenDeviceDropdown(!openDeviceDropdown)}
                          className="w-[55px] justify-center px-3 py-2 bg-gray-200 rounded-md flex items-center device-icon"
                          style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                        >
                          {outputEmailWidth === 'Mobile' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="25px" viewBox="0 0 24 24" fill="none">
                              <path d="M11 18H13M9.2 21H14.8C15.9201 21 16.4802 21 16.908 20.782C17.2843 20.5903 17.5903 20.2843 17.782 19.908C18 19.4802 18 18.9201 18 17.8V6.2C18 5.0799 18 4.51984 17.782 4.09202C17.5903 3.71569 17.2843 3.40973 16.908 3.21799C16.4802 3 15.9201 3 14.8 3H9.2C8.0799 3 7.51984 3 7.09202 3.21799C6.71569 3.40973 6.40973 3.71569 6.21799 4.09202C6 4.51984 6 5.07989 6 6.2V17.8C6 18.9201 6 19.4802 6.21799 19.908C6.40973 20.2843 6.71569 20.5903 7.09202 20.782C7.51984 21 8.07989 21 9.2 21Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {outputEmailWidth === 'Tab' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="25px" viewBox="0 0 24 24" fill="none">
                              <rect x="4" y="3" width="16" height="18" rx="1" stroke="#200E32" strokeWidth="2" strokeLinecap="round"/>
                              <circle cx="12" cy="18" r="1" fill="#200E32"/>
                            </svg>
                          )}
                          {outputEmailWidth === '' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="25px" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="4" width="18" height="13" rx="2" stroke="#0C0310" strokeWidth="2" strokeLinecap="round" fill="none"/>
                              <line x1="7.5" y1="21" x2="16.5" y2="21" stroke="#0C0310" strokeWidth="2" strokeLinecap="round"/>
                              <line x1="12" y1="17" x2="12" y2="21" stroke="#0C0310" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                        {openDeviceDropdown && (
                          <div className="w-[55px] absolute right-0 mt-[35px] bg-[#eeeeee] pt-[5px] rounded-b-md rounded-t-none d-flex flex-col output-responsive-button-group justify-center-991 col-12-991">
                            {outputEmailWidth !== 'Mobile' && (
                              <button className="w-[55px] button pad-10 d-flex align-center align-self-center output-email-width-button-mobile justify-center" onClick={() => { setOutputEmailWidth('Mobile'); setOpenDeviceDropdown(false); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="25px" viewBox="0 0 24 24" fill="none">
                                  <path d="M11 18H13M9.2 21H14.8C15.9201 21 16.4802 21 16.908 20.782C17.2843 20.5903 17.5903 20.2843 17.782 19.908C18 19.4802 18 18.9201 18 17.8V6.2C18 5.0799 18 4.51984 17.782 4.09202C17.5903 3.71569 17.2843 3.40973 16.908 3.21799C16.4802 3 15.9201 3 14.8 3H9.2C8.0799 3 7.51984 3 7.09202 3.21799C6.71569 3.40973 6.40973 3.71569 6.21799 4.09202C6 4.51984 6 5.07989 6 6.2V17.8C6 18.9201 6 19.4802 6.21799 19.908C6.40973 20.2843 6.71569 20.5903 7.09202 20.782C7.51984 21 8.07989 21 9.2 21Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            )}
                            {outputEmailWidth !== 'Tab' && (
                              <button className="w-[55px] button pad-10 d-flex align-center align-self-center output-email-width-button-tab justify-center" onClick={() => { setOutputEmailWidth('Tab'); setOpenDeviceDropdown(false); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="25px" viewBox="0 0 24 24" fill="none">
                                  <rect x="4" y="3" width="16" height="18" rx="1" stroke="#200E32" strokeWidth="2" strokeLinecap="round"/>
                                  <circle cx="12" cy="18" r="1" fill="#200E32"/>
                                </svg>
                              </button>
                            )}
                            {outputEmailWidth !== '' && (
                              <button className="w-[55px] button pad-10 d-flex align-center align-self-center output-email-width-button-desktop justify-center" onClick={() => { setOutputEmailWidth(''); setOpenDeviceDropdown(false); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="25px" viewBox="0 0 24 24" fill="none">
                                  <rect x="3" y="4" width="18" height="13" rx="2" stroke="#0C0310" strokeWidth="2" strokeLinecap="round" fill="none"/>
                                  <line x1="7.5" y1="21" x2="16.5" y2="21" stroke="#0C0310" strokeWidth="2" strokeLinecap="round"/>
                                  <line x1="12" y1="17" x2="12" y2="21" stroke="#0C0310" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button className="button d-flex align-center square-40 justify-center" onClick={copyToClipboardHandler}>
                      {isCopyText ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none">
                          <path d="M7.29417 12.9577L10.5048 16.1681L17.6729 9" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="2"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="#000000" width="24px" height="24px" viewBox="0 0 32 32">
                          <path d="M26 4.75h-2c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25v0h0.75v21.5h-17.5v-21.5h0.75c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25v0h-2c-0.69 0-1.25 0.56-1.25 1.25v0 24c0 0.69 0.56 1.25 1.25 1.25h20c0.69-0.001 1.249-0.56 1.25-1.25v-24c-0-0.69-0.56-1.25-1.25-1.25h-0zM11 9.249h10c0.69 0 1.25-0.56 1.25-1.25s-0.56-1.25-1.25-1.25v0h-1.137c0.242-0.513 0.385-1.114 0.387-1.748v-0.001c0-2.347-1.903-4.25-4.25-4.25s-4.25 1.903-4.25 4.25v0c0.002 0.635 0.145 1.236 0.398 1.775l-0.011-0.026h-1.137c-0.69 0-1.25 0.56-1.25 1.25s0.56 1.25 1.25 1.25v0zM14.25 5c0-0 0-0.001 0-0.001 0-0.966 0.784-1.75 1.75-1.75s1.75 0.784 1.75 1.75c0 0.966-0.784 1.75-1.75 1.75v0c-0.966-0.001-1.748-0.783-1.75-1.749v-0zM19.957 13.156l-6.44 7.039-1.516-1.506c-0.226-0.223-0.536-0.361-0.878-0.361-0.69 0-1.25 0.56-1.25 1.25 0 0.345 0.14 0.658 0.366 0.884v0l2.44 2.424 0.022 0.015 0.015 0.021c0.074 0.061 0.159 0.114 0.25 0.156l0.007 0.003c0.037 0.026 0.079 0.053 0.123 0.077l0.007 0.003c0.135 0.056 0.292 0.089 0.457 0.089 0.175 0 0.341-0.037 0.491-0.103l-0.008 0.003c0.053-0.031 0.098-0.061 0.14-0.094l-0.003 0.002c0.102-0.050 0.189-0.11 0.268-0.179l-0.001 0.001 0.015-0.023 0.020-0.014 7.318-8c0.203-0.222 0.328-0.518 0.328-0.844 0-0.69-0.559-1.25-1.25-1.25-0.365 0-0.693 0.156-0.921 0.405l-0.001 0.001z"/>
                        </svg>
                      )}
                    </button>
                    
                    <button className="button square-40 !bg-transparent justify-center" onClick={() => handleModalOpen('modal-reply-expand')}>
                      <svg width="30px" height="30px" viewBox="0 0 512 512">
                        <polyline points="304 96 416 96 416 208" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
                        <line x1="405.77" y1="106.2" x2="111.98" y2="400.02" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
                        <polyline points="208 416 96 416 96 304" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expand Modal */}
                <Modal
                  show={openModals['modal-reply-expand']}
                  closeModal={() => handleModalClose('modal-reply-expand')}
                  buttonLabel="Close"
                  size="90%"
                >
                  <div style={{ padding: '20px' }}>
                    <label style={{ fontWeight: '500', fontSize: '16px', marginBottom: '12px', display: 'block' }}>Reply Editor</label>
                    <RichTextEditor value={replyText} onChange={setReplyText} />
                  </div>
                </Modal>
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || isSending}
                  style={{
                    padding: '10px 24px',
                    background: (!replyText.trim() || isSending) ? '#ccc' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!replyText.trim() || isSending) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {isSending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InboxView;
