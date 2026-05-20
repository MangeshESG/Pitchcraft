import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config';
import LoadingSpinner from '../common/LoadingSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';

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
  contactName?: string;
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

interface AllMessagesTabProps {
  effectiveUserId: string;
  token: string | null;
  selectedInboxId: number | null;
  selectedProvider: string;
  selectedThread: InboxThread | null;
  onThreadSelect: (thread: InboxThread) => void;
  onInitializeCollapsedEmails: (collapsed: { [key: string]: boolean }) => void;
  onReplyReset: () => void;
  refreshTrigger: number;
}

const AllMessagesTab: React.FC<AllMessagesTabProps> = ({
  effectiveUserId,
  token,
  selectedInboxId,
  selectedProvider,
  selectedThread,
  onThreadSelect,
  onInitializeCollapsedEmails,
  onReplyReset,
  refreshTrigger
}) => {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllMessages = async () => {
      if (!selectedInboxId || !selectedProvider) return;

      setLoading(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Inbox/get_combined_inbox_threads?clientId=${effectiveUserId}&inboxId=${selectedInboxId}&provider=${selectedProvider}&pageNumber=${currentPage}&pageSize=${pageSize}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (response.data.success && response.data.data) {
          setThreads(Array.isArray(response.data.data.data) ? response.data.data.data : []);
          setTotalCount(response.data.data.totalCount || 0);
          setTotalPages(response.data.data.totalPages || 0);
        } else {
          setThreads([]);
        }
      } catch (err: any) {
        console.error('Error fetching all messages:', err);
        setThreads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMessages();
  }, [selectedInboxId, selectedProvider, effectiveUserId, token, currentPage, refreshTrigger]);

  const handleThreadClick = async (thread: InboxThread) => {
    onThreadSelect(thread);
    onReplyReset();
    
    // Initialize all emails as collapsed
    const collapsed: { [key: string]: boolean } = {};
    thread.messages.forEach((msg, idx) => {
      collapsed[`${msg.messageId}-${idx}`] = true;
    });
    onInitializeCollapsedEmails(collapsed);
    
    // Mark thread as read
    if (thread.hasUnread) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/Inbox/mark-read?id=${encodeURIComponent(thread.trackingId)}`,
          {},
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        
        // Update thread state
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

  const toggleThreadSelection = (trackingId: string) => {
    setSelectedThreadIds(prev => 
      prev.includes(trackingId) 
        ? prev.filter(id => id !== trackingId)
        : [...prev, trackingId]
    );
  };

  const handleBulkDelete = async (deleteMode: 'soft' | 'Permanent') => {
    if (selectedThreadIds.length === 0) return;
    
    const confirmMessage = deleteMode === 'Permanent' 
      ? `Are you sure you want to permanently delete ${selectedThreadIds.length} email(s)? This action cannot be undone.`
      : `Are you sure you want to delete ${selectedThreadIds.length} email(s) from inbox?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Inbox/delete-conversation`,
        {
          TrackingIds: selectedThreadIds,
          deleteMode: deleteMode,
          clientid: parseInt(effectiveUserId)
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
        setThreads(threads.filter(t => !selectedThreadIds.includes(t.trackingId)));
        setSelectedThreadIds([]);
      }
    } catch (err: any) {
      console.error('Error deleting emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const extractSenderName = (emailString: string): string => {
    const match = emailString.match(/^"?(.+?)"?\s*</);
    if (match) {
      return match[1].replace(/"/g, '').trim();
    }
    const email = emailString.match(/<(.+?)>/) ? emailString.match(/<(.+?)>/)![1] : emailString;
    return email.split('@')[0];
  };

  const getInitials = (email: string, contactName?: string): string => {
    const name = contactName || extractSenderName(email);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
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

  const sortedGroups = Object.entries(groupedThreads).sort(([groupA], [groupB]) => {
    const order = { 'Today': 0, 'Last Week': 1, 'Older': 2 };
    return order[groupA as keyof typeof order] - order[groupB as keyof typeof order];
  });

  if (loading) {
    return <LoadingSpinner message="Loading all messages..." />;
  }

  if (!selectedInboxId) {
    return <div className="no-mails">Please select an inbox</div>;
  }

  return (
    <>
      {/* Pagination Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedThreadIds.length > 0 && (
            <button
              onClick={() => handleBulkDelete('soft')}
              style={{
                padding: '8px',
                background: 'transparent',
                color: '#3f9f42',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title={`Delete ${selectedThreadIds.length} email(s)`}
            >
              <FontAwesomeIcon
                icon={faTrashAlt}
                style={{ fontSize: 20, color: '#3f9f42' }}
              />
            </button>
          )}
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            Page {currentPage} of {totalPages} ({totalCount} total)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: currentPage === 1 ? '#f3f4f6' : '#fff',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              color: currentPage === 1 ? '#9ca3af' : '#374151'
            }}
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: currentPage === totalPages ? '#f3f4f6' : '#fff',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              color: currentPage === totalPages ? '#9ca3af' : '#374151'
            }}
          >
            ›
          </button>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="no-mails">No messages found</div>
      ) : (
        sortedGroups.map(([group, groupThreads]) => (
          <div key={group}>
            <div className="mail-group-header">{group}</div>
            {groupThreads.map((thread) => {
              const lastMessage = thread.messages[thread.messages.length - 1];
              const isSelected = selectedThreadIds.includes(thread.trackingId);
              return (
                <div
                  key={thread.trackingId}
                  className={`mail-item ${thread.hasUnread ? 'unread' : ''} ${selectedThread?.trackingId === thread.trackingId ? 'selected' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (selectedThreadIds.length > 0) {
                      toggleThreadSelection(thread.trackingId);
                    } else {
                      handleThreadClick(thread);
                    }
                  }}
                  onMouseEnter={() => setHoveredThreadId(thread.trackingId)}
                  onMouseLeave={() => setHoveredThreadId(null)}
                  style={{ position: 'relative' }}
                >
                  {(hoveredThreadId === thread.trackingId || selectedThreadIds.length > 0) && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleThreadSelection(thread.trackingId)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                  )}
                  <div className="mail-avatar" style={{ marginLeft: (hoveredThreadId === thread.trackingId || selectedThreadIds.length > 0) ? '30px' : '0' }}>{getInitials(thread.contactEmail, lastMessage.contactName)}</div>
                  <div className="mail-content">
                    <div className="mail-item-header">
                      <span className="mail-sender">{lastMessage.contactName || extractSenderName(thread.contactEmail)}</span>
                      <span className="mail-date">{formatDate(thread.lastMessageDate)}</span>
                    </div>
                    <div className="mail-subject">
                      {thread.totalMessages > 1 && <span className="reply-icon">↩ {thread.totalMessages}</span>}
                      {thread.subject}
                    </div>
                    <div className="mail-preview">
                      {(() => {
                        let cleanText = lastMessage.body;
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
              );
            })}
          </div>
        ))
      )}
    </>
  );
};

export default AllMessagesTab;
