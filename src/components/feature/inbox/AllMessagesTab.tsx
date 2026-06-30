import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../../config';
import DeleteConfirmationModal from '../../common/DeleteConfirmationModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';
import { faEllipsisV, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import { Pin, PinOff } from 'lucide-react';
import { isThreadPinned, pinEmail } from './inboxPin';

interface InboxAttachment {
  id?: number;
  messageId?: string;
  fileName?: string;
  originalFileName?: string;
  contentType?: string;
  filePath?: string;
  fileSize?: number;
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
  contactName?: string;
  attachments?: InboxAttachment[];
}

interface InboxThread {
  trackingId: string;
  subject: string;
  contactEmail: string;
  totalMessages: number;
  lastMessageDate: string;
  hasUnread: boolean;
  isPinned?: boolean;
  isPin?: boolean;
  contactId: number | null;
  messages: InboxMessage[];
}

interface AllMessagesTabProps {
  effectiveUserId: string;
  token: string | null;
  selectedInboxId: number | null;
  selectedProvider: string;
  isActive: boolean;
  selectedThread: InboxThread | null;
  onThreadSelect: (thread: InboxThread | null) => void;
  onInitializeCollapsedEmails: (collapsed: { [key: string]: boolean }) => void;
  onReplyReset: () => void;
  onUnreadCountsRefresh?: () => Promise<void> | void;
  refreshTrigger: number;
  onShowReplySection?: (show: boolean) => void;
  onSetReplyText?: (text: string) => void;
}

const AllMessagesTab: React.FC<AllMessagesTabProps> = ({
  effectiveUserId,
  token,
  selectedInboxId,
  selectedProvider,
  isActive,
  selectedThread,
  onThreadSelect,
  onInitializeCollapsedEmails,
  onReplyReset,
  onUnreadCountsRefresh,
  refreshTrigger,
  onSetReplyText
}) => {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteMode, setPendingDeleteMode] = useState<'soft' | 'Permanent'>('soft');
  const [pinningThreadId, setPinningThreadId] = useState<string | null>(null);
  const [activeActionThreadId, setActiveActionThreadId] = useState<string | null>(null);
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<string | null>(null);

  const fetchAllMessages = useCallback(async (showLoader = true) => {
    if (!isActive || !selectedInboxId || !selectedProvider) return;

    if (showLoader) {
      setLoading(true);
    }
    try {
      const fetchPage = (pageNumber: number) => axios.get(
        `${API_BASE_URL}/api/Inbox/get_combined_inbox_threads?clientId=${effectiveUserId}&inboxId=${selectedInboxId}&provider=${selectedProvider}&pageNumber=${pageNumber}&pageSize=${pageSize}&_=${Date.now()}`,
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
    } catch (err: any) {
      console.error('Error fetching all messages:', err);
      setThreads([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [isActive, selectedInboxId, selectedProvider, effectiveUserId, token, currentPage, pageSize]);

  useEffect(() => {
    if (isActive) {
      fetchAllMessages();
    }
  }, [fetchAllMessages, refreshTrigger]);

  // Reset to page 1 when tab becomes active
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedInboxId, selectedProvider]);

  const handleThreadClick = async (thread: InboxThread) => {
    onThreadSelect(thread);
    onReplyReset();
    
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
      const uniqueKey = `all-${message.messageId}-${index}`;
      // Collapse all messages initially
      collapsed[uniqueKey] = true;
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
        await onUnreadCountsRefresh?.();
      } catch (err) {
        console.error('Error marking thread as read:', err);
      }
    }
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
          onReplyReset();
        }
        setSelectedThreadIds([]);
        setShowDeleteDropdown(false);
        setActiveActionThreadId(null);
        setPendingDeleteThreadId(null);
        await fetchAllMessages(false);
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

  const handlePinEmail = async (thread: InboxThread, event: React.MouseEvent<HTMLButtonElement>) => {
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

  const getThreadAttachmentCount = (thread: InboxThread): number => {
    return thread.messages.reduce((count, message) => count + (message.attachments?.length || 0), 0);
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

  if (!selectedInboxId) {
    return <div className="no-mails">Please select an inbox</div>;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: '12px' }}>
        <div style={{ width: 24, height: 24, border: '3px solid #eaf5ea', borderTop: '3px solid #3f9f42', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#9aa1ab' }}>Loading messages…</span>
      </div>
    );
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
              const attachmentCount = getThreadAttachmentCount(thread);
              const threadPinned = isThreadPinned(thread);
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
                      <span className="mail-sender">{lastMessage.contactName || extractSenderName(thread.contactEmail)}</span>
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
              );
            })}
          </div>
        ))
      )}

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
    </>
  );
};

export default AllMessagesTab;
