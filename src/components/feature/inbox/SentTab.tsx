import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../config';
import DeleteConfirmationModal from '../../common/DeleteConfirmationModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';
import { faPaperclip } from '@fortawesome/free-solid-svg-icons';

interface SentAttachment {
  id?: number;
  messageId?: string;
  fileName?: string;
  originalFileName?: string;
  contentType?: string;
  filePath?: string;
  fileSize?: number;
}

interface SentMessage {
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
  attachments?: SentAttachment[];
}

interface SentThread {
  trackingId: string;
  subject: string;
  contactEmail: string;
  totalMessages: number;
  lastMessageDate: string;
  hasUnread: boolean;
  contactId: number | null;
  messages: SentMessage[];
}

interface SentTabProps {
  effectiveUserId: string;
  token: string | null;
  selectedInboxId: number | null;
  selectedProvider: string;
  selectedThread: SentThread | null;
  onThreadSelect: (thread: SentThread | null) => void;
  onInitializeCollapsedEmails: (collapsed: { [key: string]: boolean }) => void;
  onReplyReset?: () => void;
  refreshTrigger?: number;
}

const SentTab: React.FC<SentTabProps> = ({ 
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
  const [threads, setThreads] = useState<SentThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteMode, setPendingDeleteMode] = useState<'soft' | 'Permanent'>('soft');

  const fetchSentEmails = useCallback(async (showLoader = true) => {
    if (!effectiveUserId || !selectedInboxId || !selectedProvider) return;

    if (showLoader) {
      setLoading(true);
    }
    setError('');
    try {
      const fetchPage = (pageNumber: number) => axios.get(
        `${API_BASE_URL}/api/Inbox/get_sent_only?inboxId=${selectedInboxId}&Provider=${selectedProvider}&pageNumber=${pageNumber}&pageSize=${pageSize}&_=${Date.now()}`,
        {
          headers: {
            accept: '*/*',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const response = await fetchPage(currentPage);

      if (response.data.success && response.data.data) {
        let pageThreads = response.data.data.data || [];
        const nextTotalCount = response.data.data.totalCount || 0;
        const nextTotalPages = response.data.data.totalPages || 0;
        let nextPage = currentPage + 1;

        while (pageThreads.length < pageSize && nextPage <= nextTotalPages && pageThreads.length < nextTotalCount) {
          const nextResponse = await fetchPage(nextPage);
          const nextThreads = nextResponse.data.success && nextResponse.data.data
            ? nextResponse.data.data.data || []
            : [];
          if (nextThreads.length === 0) break;
          pageThreads = [...pageThreads, ...nextThreads].slice(0, pageSize);
          nextPage += 1;
        }

        setThreads(pageThreads);
        setTotalCount(nextTotalCount);
        setTotalPages(nextTotalPages);
      }
    } catch (err) {
      console.error('Error fetching sent emails:', err);
      setError('Failed to load sent emails');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [effectiveUserId, token, selectedInboxId, selectedProvider, currentPage, pageSize]);

  useEffect(() => {
    fetchSentEmails();
  }, [fetchSentEmails, refreshTrigger]);

  const handleThreadClick = async (thread: SentThread) => {
    if (onReplyReset) {
      onReplyReset();
    }
    
    onThreadSelect(thread);
    
    // Start all messages expanded
    onInitializeCollapsedEmails({});
  };

  const currentPageThreadIds = threads.map(thread => thread.trackingId);
  const areAllCurrentPageThreadsSelected = currentPageThreadIds.length > 0 && currentPageThreadIds.every(id => selectedThreadIds.includes(id));

  const toggleCurrentPageThreadSelection = () => {
    setSelectedThreadIds(prev => {
      if (areAllCurrentPageThreadsSelected) {
        return prev.filter(id => !currentPageThreadIds.includes(id));
      }

      return Array.from(new Set([...prev, ...currentPageThreadIds]));
    });
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
        setSelectedThreadIds([]);
        setShowDeleteDropdown(false);
        await fetchSentEmails(false);
      }
    } catch (err: any) {
      console.error('Error deleting emails:', err);
    } finally {
      setLoading(false);
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

  const getInitials = (email: string, fromName?: string | null): string => {
    const name = fromName || extractSenderName(email);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  };

  const getThreadAttachmentCount = (thread: SentThread): number => {
    return thread.messages.reduce((count, message) => count + (message.attachments?.length || 0), 0);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: '12px' }}>
        <div style={{ width: 24, height: 24, border: '3px solid #eaf5ea', borderTop: '3px solid #3f9f42', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#9aa1ab' }}>Loading sent…</span>
      </div>
    );
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

  if (totalCount === 0) {
    return <div className="no-mails">No sent emails found</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedThreadIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
              <input
                type="checkbox"
                checked={areAllCurrentPageThreadsSelected}
                onChange={toggleCurrentPageThreadSelection}
                title={areAllCurrentPageThreadsSelected ? 'Deselect all emails on this page' : 'Select all emails on this page'}
                aria-label={areAllCurrentPageThreadsSelected ? 'Deselect all emails on this page' : 'Select all emails on this page'}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
            </div>
          )}
          {selectedThreadIds.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDeleteDropdown(!showDeleteDropdown)}
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
              
              {showDeleteDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 100,
                  minWidth: '180px'
                }}>
                  <button
                    onClick={() => {
                      setPendingDeleteMode('soft');
                      setShowDeleteModal(true);
                      setShowDeleteDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Delete from Inbox
                  </button>
                  <button
                    onClick={() => {
                      setPendingDeleteMode('Permanent');
                      setShowDeleteModal(true);
                      setShowDeleteDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#ef4444',
                      fontWeight: '500',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Delete permanently
                  </button>
                </div>
              )}
            </div>
          )}
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            Page {currentPage} of {totalPages}
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
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {threads.map((thread) => {
          const lastMessage = thread.messages[thread.messages.length - 1];
          // Check if any message in thread is unread
          const hasUnreadMessages = thread.messages.some(msg => !msg.isRead);
          const isSelected = selectedThreadIds.includes(thread.trackingId);
          const attachmentCount = getThreadAttachmentCount(thread);
          return (
            <div
              key={thread.trackingId}
              className={`mail-item ${hasUnreadMessages ? 'unread' : ''} ${selectedThread?.trackingId === thread.trackingId ? 'selected' : ''} ${isSelected ? 'selected' : ''}`}
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
              {(hoveredThreadId === thread.trackingId || selectedThreadIds.length > 0) ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', marginLeft: 0 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleThreadSelection(thread.trackingId)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              ) : (
                <div className="mail-avatar">{getInitials(thread.contactEmail, lastMessage.contactName)}</div>
              )}
              <div className="mail-content">
                <div className="mail-item-header">
                  <span 
                    className="mail-sender"
                    style={{
                      cursor: thread.contactId ? 'pointer' : 'default',
                      color: thread.contactId ? '#3f9f42' : 'inherit',
                      textDecoration: thread.contactId ? 'underline' : 'none'
                    }}
                    onClick={(e) => {
                      if (thread.contactId) {
                        e.stopPropagation();
                        const clientId = sessionStorage.getItem('clientId') || '';
                        const contactDetailsUrl = `/#/contact-details/${thread.contactId}?tab=Output&clientId=${clientId}`;
                        window.open(contactDetailsUrl, '_blank');
                      }
                    }}
                  >
                    {lastMessage.contactName || extractSenderName(thread.contactEmail)}
                  </span>
                  <span className="mail-date">{formatDate(thread.lastMessageDate)}</span>
                </div>
                <div className="mail-subject">
                  {thread.totalMessages > 1 && <span className="reply-icon">↩ {thread.totalMessages}</span>}
                  {attachmentCount > 0 && (
                    <span
                      title={`${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''}`}
                      style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', color: '#6b7280' }}
                    >
                      <FontAwesomeIcon icon={faPaperclip} />
                    </span>
                  )}
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

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        deleteMode={pendingDeleteMode}
        count={selectedThreadIds.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          handleBulkDelete(pendingDeleteMode);
        }}
      />
    </div>
  );
};

export default SentTab;
