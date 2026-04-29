import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config';
import LoadingSpinner from '../common/LoadingSpinner';
import RichTextEditor from '../common/RTEEditor';
import './InboxView.css';

interface InboxDropdownItem {
  inboxId: number;
  emailAddress: string;
  provider: string;
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
                <style>
                  {`
                    .reply-section .rich-text-editor > div {
                      min-height: 30px !important;
                      max-height: 100px !important;
                    }
                  `}
                </style>
                <div style={{ marginBottom: '12px' }}>
                  <RichTextEditor value={replyText} onChange={setReplyText} />
                </div>
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
