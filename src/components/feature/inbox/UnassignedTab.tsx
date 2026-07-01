import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../config';
import DeleteConfirmationModal from '../../common/DeleteConfirmationModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';
import { faEllipsisV, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import { Pin, PinOff } from 'lucide-react';
import { isThreadPinned, pinEmail } from './inboxPin';

interface UnassignedAttachment {
  id?: number;
  messageId?: string;
  fileName?: string;
  originalFileName?: string;
  contentType?: string;
  filePath?: string;
  fileSize?: number;
}

interface UnassignedMessage {
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
  attachments?: UnassignedAttachment[];
}

interface UnassignedThread {
  trackingId: string;
  subject: string;
  contactEmail: string;
  totalMessages: number;
  lastMessageDate: string;
  hasUnread: boolean;
  isPinned?: boolean;
  isPin?: boolean;
  contactId: number | null;
  messages: UnassignedMessage[];
}

interface UnassignedEmail {
  id: number;
  messageId: string;
  inReplyTo: string | null;
  threadId: string;
  trackingid?: string | null;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  provider: string;
  contactId: number | null;
  attachments?: UnassignedAttachment[];
}

interface UnassignedTabProps {
  effectiveUserId: string;
  token: string | null;
  selectedInboxId: number | null;
  isActive?: boolean;
  onEmailSelect: (email: UnassignedEmail | null) => void;
  selectedEmail: UnassignedEmail | null;
  onReplyReset?: () => void;
  selectedProvider: string;
  selectedThread: UnassignedThread | null;
  onThreadSelect: (thread: UnassignedThread | null) => void;
  onInitializeCollapsedEmails: (collapsed: { [key: string]: boolean }) => void;
  onUnreadCountsRefresh?: () => Promise<void> | void;
  refreshTrigger?: number;
  onSetReplyText?: (text: string) => void;
}

const UnassignedTab: React.FC<UnassignedTabProps> = ({ 
  effectiveUserId, 
  token, 
  selectedInboxId, 
  isActive = true,
  onEmailSelect, 
  selectedEmail, 
  onReplyReset, 
  selectedProvider,
  selectedThread,
  onThreadSelect,
  onInitializeCollapsedEmails,
  onUnreadCountsRefresh,
  refreshTrigger,
  onSetReplyText
}) => {
  const [threads, setThreads] = useState<UnassignedThread[]>([]);
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
  const [pinningThreadId, setPinningThreadId] = useState<string | null>(null);
  const [activeActionThreadId, setActiveActionThreadId] = useState<string | null>(null);
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<string | null>(null);

  const fetchUnassignedEmails = useCallback(async (showLoader = true) => {
    if (!isActive || !effectiveUserId || !selectedInboxId || !selectedProvider) return;

    if (showLoader) {
      setLoading(true);
    }
    setError('');
    try {
      const fetchPage = (pageNumber: number) => axios.get(
        `${API_BASE_URL}/api/Inbox/get_unassigned_inbox?clientId=${effectiveUserId}&inboxId=${selectedInboxId}&Provider=${selectedProvider}&pageNumber=${pageNumber}&pageSize=${pageSize}&_=${Date.now()}`,
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
        const pageThreads = Array.isArray(response.data.data.data) ? response.data.data.data : [];
        const nextTotalCount = response.data.data.totalCount || 0;
        const nextTotalPages = response.data.data.totalPages || 0;

        setThreads(pageThreads);
        setTotalCount(nextTotalCount);
        setTotalPages(nextTotalPages);
      } else {
        setThreads([]);
      }
    } catch (err) {
      console.error('Error fetching unassigned emails:', err);
      setError('Failed to load unassigned emails');
      setThreads([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [isActive, effectiveUserId, token, selectedInboxId, selectedProvider, currentPage, pageSize]);

  useEffect(() => {
    if (isActive) {
      fetchUnassignedEmails();
    }
  }, [fetchUnassignedEmails, refreshTrigger]);

  const handleThreadClick = async (thread: UnassignedThread) => {
    if (onReplyReset) {
      onReplyReset();
    }
    
    onThreadSelect(thread);
    
    // Fetch and set default signature
    if (onSetReplyText) {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Crm/Single_signatures/${effectiveUserId}?InboxId=${selectedInboxId}&Provider=${selectedProvider}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        
        if (response.data && response.data.signatureHtml) {
          onSetReplyText(`<br/><br/>${response.data.signatureHtml}`);
        }
      } catch (err) {
        console.error('Error fetching signature:', err);
      }
    }
    
    // Start with all messages collapsed
    const collapsed: { [key: string]: boolean } = {};
    const sortedMessages = [...thread.messages].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    sortedMessages.forEach((message, index) => {
      const uniqueKey = `unassigned-${message.messageId}-${index}`;
      // Collapse all messages initially
      collapsed[uniqueKey] = true;
    });
    onInitializeCollapsedEmails(collapsed);
    
    const firstMessage = thread.messages[0];
    const unassignedEmail: UnassignedEmail = {
      id: 0,
      messageId: firstMessage.messageId,
      inReplyTo: null,
      threadId: thread.trackingId,
      trackingid: thread.trackingId,
      fromEmail: firstMessage.fromEmail,
      fromName: firstMessage.contactName || null,
      subject: thread.subject,
      body: firstMessage.body,
      date: firstMessage.date,
      isRead: firstMessage.isRead,
      provider: selectedProvider,
      contactId: thread.contactId,
      attachments: firstMessage.attachments
    };
    
    onEmailSelect(unassignedEmail);
    
    // Check if thread has any unread messages
    const hasAnyUnread = thread.messages.some(msg => !msg.isRead);
    
    if (hasAnyUnread) {
      try {
        // Mark thread as read using the correct API endpoint
        await axios.post(
          `${API_BASE_URL}/api/Inbox/mark-unassigned-read?id=${encodeURIComponent(thread.trackingId)}`,
          {},
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        
        // Update local state to mark all messages as read
        setThreads(prevThreads => 
          prevThreads.map(t => 
            t.trackingId === thread.trackingId 
              ? { ...t, hasUnread: false, messages: t.messages.map(m => ({ ...m, isRead: true })) }
              : t
          )
        );
        await onUnreadCountsRefresh?.();
      } catch (err) {
        console.error('Error marking thread as read:', err);
      }
    }
  };

  const currentPageThreadIds = (Array.isArray(threads) ? threads : []).map(thread => thread.trackingId);
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

  const handleBulkDelete = async (deleteMode: 'soft' | 'Permanent', trackingIdsOverride?: string[]) => {
    const trackingIdsToDelete = trackingIdsOverride || (pendingDeleteThreadId ? [pendingDeleteThreadId] : selectedThreadIds);
    if (trackingIdsToDelete.length === 0) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Inbox/delete-conversation`,
        {
          TrackingIds: trackingIdsToDelete,
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
        if (selectedThread && trackingIdsToDelete.includes(selectedThread.trackingId)) {
          onThreadSelect(null);
          onEmailSelect(null);
          onReplyReset?.();
        }
        setSelectedThreadIds([]);
        setShowDeleteDropdown(false);
        setActiveActionThreadId(null);
        setPendingDeleteThreadId(null);
        await fetchUnassignedEmails(false);
      }
    } catch (err: any) {
      console.error('Error deleting emails:', err);
    } finally {
      setActiveActionThreadId(null);
      setPendingDeleteThreadId(null);
      setLoading(false);
    }
  };

  const requestDelete = (deleteMode: 'soft' | 'Permanent', trackingId?: string) => {
    const trackingIdsToDelete = trackingId ? [trackingId] : selectedThreadIds;

    setPendingDeleteThreadId(trackingId || null);
    setPendingDeleteMode(deleteMode);
    setShowDeleteDropdown(false);
    setActiveActionThreadId(null);

    if (deleteMode === 'soft') {
      handleBulkDelete(deleteMode, trackingIdsToDelete);
      return;
    }

    setShowDeleteModal(true);
  };

  const handlePinEmail = async (thread: UnassignedThread, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!effectiveUserId || pinningThreadId) return;

    const nextPinned = !isThreadPinned(thread);
    setPinningThreadId(thread.trackingId);
    setActiveActionThreadId(null);
    try {
      const response = await pinEmail(effectiveUserId, thread.trackingId, token);

      if (response.data?.success) {
        setThreads(prevThreads =>
          prevThreads.map(t =>
            t.trackingId === thread.trackingId ? { ...t, isPinned: nextPinned, isPin: nextPinned } : t
          )
        );
      }
    } catch (err) {
      console.error('Error pinning email:', err);
    } finally {
      setPinningThreadId(null);
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

  const getThreadAttachmentCount = (thread: UnassignedThread): number => {
    return thread.messages.reduce((count, message) => count + (message.attachments?.length || 0), 0);
  };

  const formatEmailBody = (body: string): string => {
    const containsActualHtml = /<\/?(?:html|head|body|div|table|p|span|font|blockquote|br)\b/i.test(body);
    const containsEncodedHtml = /&lt;\/?(?:html|head|body|div|table|p|span|font|blockquote|br)\b/i.test(body);

    if (containsActualHtml || !containsEncodedHtml) {
      return body;
    }

    let formatted = body
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    return formatted;
  };

  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: '12px' }}>
        <div style={{ width: 24, height: 24, border: '3px solid #eaf5ea', borderTop: '3px solid #3f9f42', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#9aa1ab' }}>Loading…</span>
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
    return <div className="no-mails">No unassigned emails found</div>;
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
                title={`Remove ${selectedThreadIds.length} email(s) from inbox`}
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
                      requestDelete('soft');
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
                    Remove from Inbox
                  </button>
                  <button
                    onClick={() => {
                      setPendingDeleteThreadId(null);
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
                      color: '#374151',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Delete permanently
                  </button>
                </div>
              )}
            </div>
          )}
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            Page {currentPage} of {totalPages} | {totalCount} {totalCount === 1 ? 'email' : 'emails'}
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
              background: currentPage === 1 ? '#f3f4f6' : '#e2f1e3',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              color: currentPage === 1 ? '#9ca3af' : '#3f9f42'
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
              background: currentPage === totalPages ? '#f3f4f6' : '#e2f1e3',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              color: currentPage === totalPages ? '#9ca3af' : '#3f9f42'
            }}
          >
            ›
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {(Array.isArray(threads) ? threads : []).map((thread) => {
          const lastMessage = thread.messages[thread.messages.length - 1];
          // Check if any message in thread is unread
          const hasUnreadMessages = thread.messages.some(msg => !msg.isRead);
          const isSelected = selectedThreadIds.includes(thread.trackingId);
          const attachmentCount = getThreadAttachmentCount(thread);
          const threadPinned = isThreadPinned(thread);
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
                <span className="mail-row-actions">
                  <span className="mail-date">{formatDate(thread.lastMessageDate)}</span>
                  {threadPinned && (
                    <span className="mail-pinned-indicator" title="Pinned" aria-label="Pinned">
                      <Pin size={15} strokeWidth={2.5} />
                    </span>
                  )}
                  <span className="mail-action-wrapper" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className="mail-action-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveActionThreadId(activeActionThreadId === thread.trackingId ? null : thread.trackingId);
                      }}
                      title="Email actions"
                      aria-label="Email actions"
                    >
                      <FontAwesomeIcon icon={faEllipsisV} />
                    </button>
                    {activeActionThreadId === thread.trackingId && (
                      <div className="mail-action-menu">
                        <button
                          type="button"
                          onClick={(event) => handlePinEmail(thread, event)}
                          disabled={pinningThreadId === thread.trackingId}
                        >
                          {threadPinned ? (
                            <PinOff size={17} strokeWidth={2.5} />
                          ) : (
                            <Pin size={17} strokeWidth={2.5} />
                          )}
                          {threadPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            requestDelete('soft', thread.trackingId);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                          Remove from Inbox
                        </button>
                      </div>
                    )}
                  </span>
                </span>
              </div>
              <div className="mail-subject">
                {attachmentCount > 0 && (
                  <span
                    title={`${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', color: '#6b7280' }}
                  >
                    <FontAwesomeIcon icon={faPaperclip} />
                  </span>
                )}
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
        );})}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        deleteMode={pendingDeleteMode}
        count={pendingDeleteThreadId ? 1 : selectedThreadIds.length}
        onClose={() => {
          setShowDeleteModal(false);
          setPendingDeleteThreadId(null);
        }}
        onConfirm={() => {
          setShowDeleteModal(false);
          handleBulkDelete(pendingDeleteMode);
        }}
      />
    </div>
  );
};

export default UnassignedTab;
