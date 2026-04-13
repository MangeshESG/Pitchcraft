import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config';
import LoadingSpinner from '../common/LoadingSpinner';
import './InboxView.css';

interface InboxDropdownItem {
  inboxId: number;
  emailAddress: string;
}

interface InboxMail {
  id: number;
  clientId: number;
  contactId: number;
  campaignId: number;
  messageId: string;
  inReplyTo: string;
  fromEmail: string;
  subject: string;
  body: string;
  trackingId: string;
  date: string;
  isRead: boolean;
  createdAt: string;
}

interface InboxViewProps {
  effectiveUserId: string;
  token: string | null;
  isVisible: boolean;
}

const InboxView: React.FC<InboxViewProps> = ({ effectiveUserId, token, isVisible }) => {
  const [inboxList, setInboxList] = useState<InboxDropdownItem[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [mails, setMails] = useState<InboxMail[]>([]);
  const [selectedMail, setSelectedMail] = useState<InboxMail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

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
          `${API_BASE_URL}/api/Inbox/inbox?inboxId=${selectedInboxId}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (response.data.success && response.data.data) {
          setMails(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching mails:', err);
        setError('Failed to load emails');
      } finally {
        setLoading(false);
      }
    };

    fetchMails();
  }, [selectedInboxId, token, isVisible]);

  const handleInboxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const inboxId = parseInt(e.target.value);
    setSelectedInboxId(inboxId);
    setSelectedMail(null);
  };

  const handleMailClick = (mail: InboxMail) => {
    setSelectedMail(mail);
  };

  const extractEmailAddress = (emailString: string): string => {
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString;
  };

  const extractSenderName = (emailString: string): string => {
    const match = emailString.match(/^"?(.+?)"?\s*</);
    return match ? match[1] : extractEmailAddress(emailString);
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

  const groupedMails = mails.reduce((acc, mail) => {
    const group = getTimeGroup(mail.date);
    if (!acc[group]) acc[group] = [];
    acc[group].push(mail);
    return acc;
  }, {} as Record<string, InboxMail[]>);

  const getInitials = (email: string): string => {
    const name = extractSenderName(email);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  };

  const formatEmailBody = (body: string): string => {
    return body
      .replace(/&gt;/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, '<br>');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="dashboard-section" style={{ display: isVisible ? 'block' : 'none', marginTop: '-60px' }}>
      {/* Description */}
      <p style={{ marginBottom: '20px' }}>
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
          <div className="mail-list">
            {mails.length === 0 ? (
              <div className="no-mails">No emails found</div>
            ) : (
              Object.entries(groupedMails).map(([group, groupMails]) => (
                <div key={group}>
                  <div className="mail-group-header">{group}</div>
                  {groupMails.map((mail) => (
                    <div
                      key={mail.id}
                      className={`mail-item ${selectedMail?.id === mail.id ? 'selected' : ''} ${!mail.isRead ? 'unread' : ''}`}
                      onClick={() => handleMailClick(mail)}
                    >
                      <div className="mail-avatar">{getInitials(mail.fromEmail)}</div>
                      <div className="mail-content">
                        <div className="mail-item-header">
                          <span className="mail-sender">{extractSenderName(mail.fromEmail)}</span>
                          <span className="mail-date">{formatDate(mail.date)}</span>
                        </div>
                        <div className="mail-subject">
                          {mail.inReplyTo && <span className="reply-icon">↩</span>}
                          {mail.subject}
                        </div>
                        <div className="mail-preview">
                          {mail.body.replace(/<[^>]*>/g, '').substring(0, 80)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="mail-detail">
            {selectedMail ? (
              <>
                <div className="mail-detail-header">
                  <div className="mail-detail-top">
                    <div className="mail-detail-avatar">{getInitials(selectedMail.fromEmail)}</div>
                    <div className="mail-detail-info">
                      <div className="mail-detail-sender">
                        {extractSenderName(selectedMail.fromEmail)} &lt;{extractEmailAddress(selectedMail.fromEmail)}&gt;
                      </div>
                      <div className="mail-detail-to">To: {selectedInboxId && inboxList.find(i => i.inboxId === selectedInboxId)?.emailAddress}</div>
                    </div>
                    <div className="mail-detail-date">{new Date(selectedMail.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                  </div>
                  <h3 className="mail-detail-subject">{selectedMail.subject}</h3>
                </div>
                <div className="mail-body" dangerouslySetInnerHTML={{ __html: formatEmailBody(selectedMail.body) }} />
              </>
            ) : (
              <div className="no-mail-selected">
                Select an email to view its content
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxView;
