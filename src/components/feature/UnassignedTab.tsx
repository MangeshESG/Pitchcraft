import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config';
import LoadingSpinner from '../common/LoadingSpinner';

interface UnassignedEmail {
  id: number;
  messageId: string;
  inReplyTo: string | null;
  threadId: string;
  fromEmail: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  provider: string;
}

interface UnassignedTabProps {
  effectiveUserId: string;
  token: string | null;
  selectedInboxId: number | null;
  onEmailSelect: (email: UnassignedEmail | null) => void;
  selectedEmail: UnassignedEmail | null;
}

const UnassignedTab: React.FC<UnassignedTabProps> = ({ effectiveUserId, token, selectedInboxId, onEmailSelect, selectedEmail }) => {
  const [emails, setEmails] = useState<UnassignedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchUnassignedEmails = async () => {
      if (!effectiveUserId || !selectedInboxId) return;

      setLoading(true);
      setError('');
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Inbox/get_unassigned_inbox?clientId=${effectiveUserId}&inboxId=${selectedInboxId}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (response.data.success && response.data.data) {
          setEmails(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching unassigned emails:', err);
        setError('Failed to load unassigned emails');
      } finally {
        setLoading(false);
      }
    };

    fetchUnassignedEmails();
  }, [effectiveUserId, token, selectedInboxId]);

  const handleEmailClick = async (email: UnassignedEmail) => {
    // Mark as read if unread (do this first before selecting)
    if (!email.isRead) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/Inbox/mark-unassigned-read?id=${encodeURIComponent(email.messageId)}`,
          {},
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        
        // Update local state to mark as read
        setEmails(prevEmails => 
          prevEmails.map(e => 
            e.id === email.id ? { ...e, isRead: true } : e
          )
        );
        
        // Select the email with updated read status
        onEmailSelect({ ...email, isRead: true });
      } catch (err) {
        console.error('Error marking email as read:', err);
        // Still select the email even if mark-read fails
        onEmailSelect(email);
      }
    } else {
      // Email already read, just select it
      onEmailSelect(email);
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

  const getInitials = (email: string): string => {
    const name = extractSenderName(email);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  };

  const formatEmailBody = (body: string): string => {
    let formatted = body
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    return formatted;
  };

  if (loading) {
    return <LoadingSpinner message="Loading unassigned emails..." />;
  }

  if (!selectedInboxId) {
    return (
      <div className="no-mails">Please select an inbox</div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '12px 16px',
        background: '#f8d7da',
        border: '1px solid #dc3545',
        borderRadius: 6,
        margin: '16px',
        color: '#721c24'
      }}>
        {error}
      </div>
    );
  }

  if (emails.length === 0) {
    return <div className="no-mails">No unassigned emails found</div>;
  }

  return (
    <>
      {emails.map((email) => (
        <div
          key={email.id}
          className={`mail-item ${!email.isRead ? 'unread' : ''} ${selectedEmail?.id === email.id ? 'selected' : ''}`}
          onClick={() => handleEmailClick(email)}
        >
          <div className="mail-avatar">{getInitials(email.fromEmail)}</div>
          <div className="mail-content">
            <div className="mail-item-header">
              <span className="mail-sender">{extractSenderName(email.fromEmail)}</span>
              <span className="mail-date">{formatDate(email.date)}</span>
            </div>
            <div className="mail-subject">{email.subject}</div>
            <div className="mail-preview">
              {(() => {
                let cleanText = email.body;
                const textarea = document.createElement('textarea');
                textarea.innerHTML = cleanText;
                cleanText = textarea.value;
                cleanText = cleanText
                  .replace(/<style[^>]*>.*?<\/style>/gis, '')
                  .replace(/<script[^>]*>.*?<\/script>/gis, '')
                  .replace(/<!--.*?-->/gs, '')
                  .replace(/<head[^>]*>.*?<\/head>/gis, '')
                  .replace(/<[^>]+>/g, '')
                  .replace(/&nbsp;/gi, ' ')
                  .replace(/&gt;/g, '>')
                  .replace(/&lt;/g, '<')
                  .replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/&#x[0-9A-Fa-f]+;/g, '')
                  .replace(/&#[0-9]+;/g, '')
                  .replace(/\{[^}]*\}/g, '')
                  .replace(/v\\:\*|o\\:\*|w\\:\*/g, '')
                  .replace(/behavior:url\([^)]*\)/g, '')
                  .replace(/mso-[^;:]*:[^;]*/gi, '')
                  .replace(/\s+/g, ' ')
                  .trim();
                
                if (!cleanText || cleanText.length < 5 || /^[\W_\s]+$/.test(cleanText) || /^[v\\o\\w\\]/.test(cleanText)) {
                  return 'No preview available';
                }
                
                return cleanText.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
              })()}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default UnassignedTab;
