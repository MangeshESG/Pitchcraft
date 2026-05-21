import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config';
import LoadingSpinner from '../common/LoadingSpinner';
import RichTextEditor from '../common/RTEEditor';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { copyToClipboard } from '../../utils/utils';
import Modal from '../common/Modal';
import ToastMessage from '../common/ToastMessage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';
import UnassignedTab from './UnassignedTab';
import SentTab from './SentTab';
import AllMessagesTab from './AllMessagesTab';
import ContactInfoPanel from './ContactInfoPanel';
import './InboxView.css';

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
}

interface InboxDropdownItem {
  inboxId: number;
  emailAddress: string;
  provider: string;
  inboxEmailsUnreadCount?: number;
  emailRepliesUnreadCount?: number;
  totalUnreadCount?: number;
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

interface InboxViewProps {
  effectiveUserId: string;
  token: string | null;
  isVisible: boolean;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

const InboxView: React.FC<InboxViewProps> = ({ effectiveUserId, token, isVisible, initialTab = 'Inbox', onTabChange }) => {
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
  const [expandedMessages, setExpandedMessages] = useState<{ [key: string]: boolean }>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReplySection, setShowReplySection] = useState(false);
  const [collapsedEmails, setCollapsedEmails] = useState<{ [key: string]: boolean }>({});
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);
  const [showBulkDeleteDropdown, setShowBulkDeleteDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'unassigned' | 'all' | 'allmessages'>(initialTab.toLowerCase() as 'inbox' | 'sent' | 'unassigned' | 'all' | 'allmessages');
  
  useEffect(() => {
    setActiveTab(initialTab.toLowerCase() as 'inbox' | 'sent' | 'unassigned' | 'all' | 'allmessages');
    // Clear all selections when tab changes
    setSelectedThread(null);
    setSelectedSentThread(null);
    setSelectedUnassignedThread(null);
    setSelectedAllMessagesThread(null);
    setShowReplySection(false);
    setReplyText('');
    setCollapsedEmails({});
  }, [initialTab]);
  
  const handleTabChange = (tab: 'inbox' | 'sent' | 'unassigned' | 'all' | 'allmessages') => {
    setActiveTab(tab);
    // Clear all selected threads when switching tabs
    setSelectedThread(null);
    setSelectedSentThread(null);
    setSelectedUnassignedThread(null);
    setSelectedAllMessagesThread(null);
    setShowReplySection(false);
    setReplyText('');
    setCollapsedEmails({});
    
    if (onTabChange) {
      // Convert to proper case for parent
      const tabMap = {
        'inbox': 'Inbox',
        'sent': 'Sent',
        'unassigned': 'Unassigned',
        'all': 'AllMessages',
        'allmessages': 'AllMessages'
      };
      onTabChange(tabMap[tab]);
    }
  };
  const [selectedUnassignedEmail, setSelectedUnassignedEmail] = useState<UnassignedEmail | null>(null);
  const [inboxCurrentPage, setInboxCurrentPage] = useState(1);
  const [inboxTotalCount, setInboxTotalCount] = useState(0);
  const [inboxTotalPages, setInboxTotalPages] = useState(0);
  const inboxPageSize = 10;
  const [selectedUnassignedThread, setSelectedUnassignedThread] = useState<InboxThread | null>(null);
  const [selectedSentThread, setSelectedSentThread] = useState<InboxThread | null>(null);
  const [refreshSentTab, setRefreshSentTab] = useState(0);
  const [refreshUnassignedTab, setRefreshUnassignedTab] = useState(0);
  const [refreshAllMessagesTab, setRefreshAllMessagesTab] = useState(0);
  const [selectedAllMessagesThread, setSelectedAllMessagesThread] = useState<InboxThread | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<{ inboxReplies: number; unassigned: number }>({ inboxReplies: 0, unassigned: 0 });
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalType, setDeleteModalType] = useState<'single' | 'bulk'>('single');
  const [pendingDeleteMode, setPendingDeleteMode] = useState<'soft' | 'Permanent'>('soft');

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!effectiveUserId || !isVisible || !selectedInboxId) return;
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/Inbox/unread-count?clientId=${effectiveUserId}`,
          { headers: { accept: '*/*', ...(token && { Authorization: `Bearer ${token}` }) } }
        );
        const data = res.data;
        const inboxWise: any[] = data.inboxWiseUnreadCounts || [];
        // Sum counts for the selected inbox across all providers
        const forSelected = inboxWise.filter((i: any) => i.inboxId === selectedInboxId);
        const inboxReplies = forSelected.reduce((s: number, i: any) => s + (i.emailRepliesUnreadCount || 0), 0);
        const unassigned = forSelected.reduce((s: number, i: any) => s + (i.inboxEmailsUnreadCount || 0), 0);
        setUnreadCounts({ inboxReplies, unassigned });
      } catch {}
    };
    fetchUnreadCounts();
  }, [effectiveUserId, token, isVisible, selectedInboxId]);

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
          // Auto-select first inbox if none is selected
          if (response.data.data.length > 0 && !selectedInboxId) {
            const firstInbox = response.data.data[0];
            setSelectedInboxId(firstInbox.inboxId);
            setSelectedProvider(firstInbox.provider || '');
          }
        }
      } catch (err: any) {
        console.error('Error fetching inbox list:', err);
        setToastMessage(err.response?.data?.message || 'Failed to load inbox dropdown');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
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
          `${API_BASE_URL}/api/Inbox/inbox?inboxId=${selectedInboxId}&Provider=${selectedProvider}&pageNumber=${inboxCurrentPage}&pageSize=${inboxPageSize}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (response.data.success && response.data.data) {
          setThreads(Array.isArray(response.data.data.data) ? response.data.data.data : []);
          setInboxTotalCount(response.data.data.totalCount || 0);
          setInboxTotalPages(response.data.data.totalPages || 0);
        } else {
          setThreads([]);
          setToastMessage('No emails found in this inbox');
          setToastType('info');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
      } catch (err: any) {
        console.error('Error fetching mails:', err);
        setThreads([]);
        setToastMessage(err.response?.data?.message || 'Failed to load emails. Please try again.');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchMails();
  }, [selectedInboxId, selectedProvider, token, isVisible, inboxCurrentPage]);

  const handleInboxChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const inboxId = parseInt(e.target.value);
    const inbox = inboxList.find(i => i.inboxId === inboxId);
    
    // Immediately show loader
    setLoading(true);
    setSelectedThread(null);
    setSelectedUnassignedEmail(null);
    setSelectedUnassignedThread(null);
    setSelectedSentThread(null);
    setSelectedAllMessagesThread(null);
    setThreads([]);
    
    // Small delay to ensure loader is visible
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setSelectedInboxId(inboxId);
    setSelectedProvider(inbox?.provider || '');
  };

  const handleThreadClick = async (thread: InboxThread) => {
    setSelectedThread(thread);
    setShowReplySection(false);
    setReplyText('');
    setSelectedUnassignedEmail(null);
    setSelectedUnassignedThread(null);
    
    // Initialize all emails as collapsed with unique keys
    const collapsed: { [key: string]: boolean } = {};
    thread.messages.forEach((msg, idx) => {
      collapsed[`${msg.messageId}-${idx}`] = true;
    });
    setCollapsedEmails(collapsed);
    
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
    setShowReplySection(false);
    setCollapsedEmails({});
    setShowDeleteDropdown(false);
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
        setToastMessage(`${selectedThreadIds.length} email(s) ${deleteMode === 'Permanent' ? 'deleted permanently' : 'moved to trash'}`);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        if (activeTab === 'inbox') {
          setThreads(threads.filter(t => !selectedThreadIds.includes(t.trackingId)));
        } else if (activeTab === 'sent') {
          setRefreshSentTab(prev => prev + 1);
        } else if (activeTab === 'unassigned') {
          setRefreshUnassignedTab(prev => prev + 1);
        }
        
        setSelectedThreadIds([]);
      } else {
        setToastMessage('Failed to delete emails');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err: any) {
      console.error('Error deleting emails:', err);
      setToastMessage(err.response?.data?.message || 'Failed to delete emails');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailCollapse = (messageId: string) => {
    setCollapsedEmails(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const handleDeleteEmail = async (deleteMode: 'soft' | 'Permanent') => {
    const currentThread = activeTab === 'inbox' ? selectedThread : activeTab === 'sent' ? selectedSentThread : selectedUnassignedThread;
    if (!currentThread) return;
    
    setShowDeleteDropdown(false);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Inbox/delete-conversation`,
        {
          TrackingIds: [currentThread.trackingId],
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
        setToastMessage(deleteMode === 'Permanent' ? 'Email deleted permanently' : 'Email moved to trash');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        // Remove from list and close detail view based on active tab
        if (activeTab === 'inbox') {
          setThreads(threads.filter(t => t.trackingId !== currentThread.trackingId));
          setSelectedThread(null);
        } else if (activeTab === 'sent') {
          setSelectedSentThread(null);
          setRefreshSentTab(prev => prev + 1);
        } else {
          setSelectedUnassignedThread(null);
          setRefreshUnassignedTab(prev => prev + 1);
        }
      } else {
        setToastMessage('Failed to delete email');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err: any) {
      console.error('Error deleting email:', err);
      setToastMessage(err.response?.data?.message || 'Failed to delete email');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
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

  const groupedThreads = (Array.isArray(threads) ? threads : []).reduce((acc, thread) => {
    const group = getTimeGroup(thread.lastMessageDate);
    if (!acc[group]) acc[group] = [];
    // Check if thread has any unread messages
    const hasAnyUnread = thread.messages.some(msg => !msg.isRead);
    acc[group].push({ ...thread, hasUnread: hasAnyUnread });
    return acc;
  }, {} as Record<string, InboxThread[]>);

  // Sort groups to show Today first, then Last Week, then Older
  const sortedGroups = Object.entries(groupedThreads).sort(([groupA], [groupB]) => {
    const order = { 'Today': 0, 'Last Week': 1, 'Older': 2 };
    return order[groupA as keyof typeof order] - order[groupB as keyof typeof order];
  });

  const getInitials = (email: string, contactName?: string): string => {
    const name = contactName || extractSenderName(email);
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

  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessages((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const formatFullDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleSaveDraft = async () => {
    const contactId = activeTab === 'inbox'
      ? selectedThread?.contactId
      : activeTab === 'sent'
        ? selectedSentThread?.contactId
        : activeTab === 'unassigned'
          ? selectedUnassignedThread?.contactId
          : selectedAllMessagesThread?.contactId;
    if (!replyText.trim() || !contactId) return;
    
    setIsSavingDraft(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Crm/contacts/update-email`,
        {
          clientId: parseInt(effectiveUserId),
          contactId: contactId,
          gptGenerate: false,
          emailSubject: null,
          emailBody: replyText
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
        setToastMessage('Draft saved successfully!');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 6000);
      } else {
        setToastMessage('Failed to save draft');
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 6000);
      }
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setToastMessage(err.response?.data?.message || 'Failed to save draft');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 6000);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleRefreshInbox = async () => {
    if (!selectedInboxId || !selectedProvider) return;
    
    setIsRefreshing(true);
    setError('');
    
    try {
      // First call the refresh API
      const response = await axios.post(
        `${API_BASE_URL}/api/Inbox/RefreshInbox?inboxId=${selectedInboxId}&provider=${selectedProvider}`,
        {},
        {
          headers: {
            'accept': '*/*',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      // Show success message
      setToastMessage(response.data.message || 'Inbox refreshed successfully');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Clear selected threads
      setSelectedThread(null);
      setSelectedSentThread(null);
      setSelectedUnassignedThread(null);
      
      // Refresh all tabs
      if (activeTab === 'inbox') {
        // Fetch updated inbox list
        const refreshResponse = await axios.get(
          `${API_BASE_URL}/api/Inbox/inbox?inboxId=${selectedInboxId}&Provider=${selectedProvider}&pageNumber=${inboxCurrentPage}&pageSize=${inboxPageSize}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );
        
        if (refreshResponse.data.success && refreshResponse.data.data) {
          setThreads(Array.isArray(refreshResponse.data.data.data) ? refreshResponse.data.data.data : []);
          setInboxTotalCount(refreshResponse.data.data.totalCount || 0);
          setInboxTotalPages(refreshResponse.data.data.totalPages || 0);
        }
      } else if (activeTab === 'sent') {
        setRefreshSentTab(prev => prev + 1);
      } else {
        setRefreshUnassignedTab(prev => prev + 1);
      }
    } catch (err: any) {
      console.error('Error refreshing inbox:', err);
      setToastMessage(err.response?.data?.message || 'Failed to refresh inbox');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 6000);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="dashboard-section" style={{ display: isVisible ? 'block' : 'none', marginTop: '-60px', position: 'relative' }}>
      <ToastMessage
        show={showToast}
        message={toastMessage}
        type={toastType}
        onClose={() => setShowToast(false)}
        position="bottom-center"
        duration={3}
      />
      {loading && <LoadingSpinner message="Loading..." />}

      {/* Email Content */}
      <div className="inbox-content" style={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
          {/* Mail List - Always visible on left */}
          <div className="mail-list">
            {/* Inbox Selection - Inside mail list panel */}
            <div style={{ 
              padding: '12px 16px', 
              background: '#fff', 
              borderBottom: '1px solid #e5e7eb',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={selectedInboxId || ''}
                  onChange={handleInboxChange}
                  disabled={loading || inboxList.length === 0}
                  style={{ 
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Choose an inbox</option>
                  {inboxList.map((inbox) => (
                    <option key={inbox.inboxId} value={inbox.inboxId}>
                      {inbox.emailAddress || `Inbox ${inbox.inboxId}`}
                      {inbox.totalUnreadCount ? ` (${inbox.totalUnreadCount})` : ''}
                    </option>
                  ))}
                </select>
                
                {selectedInboxId && (
                  <button
                    onClick={handleRefreshInbox}
                    disabled={isRefreshing}
                    style={{
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: isRefreshing ? 'not-allowed' : 'pointer',
                      opacity: isRefreshing ? 0.6 : 1
                    }}
                    title={isRefreshing ? 'Refreshing...' : 'Refresh inbox'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16px"
                      height="16px"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{
                        animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                      }}
                    >
                      <g fill="#3f9f42">
                        <path d="M8 1.5A6.5 6.5 0 001.5 8 .75.75 0 010 8a8 8 0 0113.5-5.81v-.94a.75.75 0 011.5 0v3a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h1.44A6.479 6.479 0 008 1.5zM15.25 7.25A.75.75 0 0116 8a8 8 0 01-13.5 5.81v.94a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H3.31A6.5 6.5 0 0014.5 8a.75.75 0 01.75-.75z" />
                      </g>
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Tabs - Remove from here since they're now in sidebar */}
              {/* <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderBottom: '2px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    handleTabChange('inbox');
                    setSelectedUnassignedEmail(null);
                    setSelectedUnassignedThread(null);
                    setSelectedSentThread(null);
                    setShowReplySection(false);
                    setReplyText('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'inbox' ? '3px solid #3f9f42' : '3px solid transparent',
                    color: activeTab === 'inbox' ? '#3f9f42' : '#6b7280',
                    fontWeight: activeTab === 'inbox' ? '600' : '400',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '-2px'
                  }}
                >
                  Inbox
                </button>
                <button
                  onClick={() => {
                    handleTabChange('sent');
                    setSelectedThread(null);
                    setSelectedUnassignedEmail(null);
                    setSelectedUnassignedThread(null);
                    setSelectedSentThread(null);
                    setShowReplySection(false);
                    setReplyText('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'sent' ? '3px solid #3f9f42' : '3px solid transparent',
                    color: activeTab === 'sent' ? '#3f9f42' : '#6b7280',
                    fontWeight: activeTab === 'sent' ? '600' : '400',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '-2px'
                  }}
                >
                  Sent
                </button>
                <button
                  onClick={() => {
                    handleTabChange('unassigned');
                    setSelectedThread(null);
                    setSelectedSentThread(null);
                    setShowReplySection(false);
                    setReplyText('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'unassigned' ? '3px solid #3f9f42' : '3px solid transparent',
                    color: activeTab === 'unassigned' ? '#3f9f42' : '#6b7280',
                    fontWeight: activeTab === 'unassigned' ? '600' : '400',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '-2px'
                  }}
                >
                  Unassigned
                </button>
                <button
                  onClick={() => {
                    handleTabChange('all');
                    setSelectedThread(null);
                    setSelectedSentThread(null);
                    setSelectedUnassignedThread(null);
                    setSelectedAllMessagesThread(null);
                    setShowReplySection(false);
                    setReplyText('');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'all' ? '3px solid #3f9f42' : '3px solid transparent',
                    color: activeTab === 'all' ? '#3f9f42' : '#6b7280',
                    fontWeight: activeTab === 'all' ? '600' : '400',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '-2px'
                  }}
                >
                  All Messages
                </button>
              </div> */}
            </div>
            
            {/* Mail list items - conditional based on active tab */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'inbox' ? (
              !selectedInboxId ? (
                <div className="no-mails">Please select an inbox</div>
              ) : (
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
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowBulkDeleteDropdown(!showBulkDeleteDropdown)}
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
                          
                          {showBulkDeleteDropdown && (
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
                                  setDeleteModalType('bulk');
                                  setPendingDeleteMode('soft');
                                  setShowDeleteModal(true);
                                  setShowBulkDeleteDropdown(false);
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
                                  setDeleteModalType('bulk');
                                  setPendingDeleteMode('Permanent');
                                  setShowDeleteModal(true);
                                  setShowBulkDeleteDropdown(false);
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
                        Page {inboxCurrentPage} of {inboxTotalPages}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => setInboxCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={inboxCurrentPage === 1}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          background: inboxCurrentPage === 1 ? '#f3f4f6' : '#fff',
                          cursor: inboxCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '18px',
                          color: inboxCurrentPage === 1 ? '#9ca3af' : '#374151'
                        }}
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setInboxCurrentPage(prev => Math.min(inboxTotalPages, prev + 1))}
                        disabled={inboxCurrentPage === inboxTotalPages}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          background: inboxCurrentPage === inboxTotalPages ? '#f3f4f6' : '#fff',
                          cursor: inboxCurrentPage === inboxTotalPages ? 'not-allowed' : 'pointer',
                          fontSize: '18px',
                          color: inboxCurrentPage === inboxTotalPages ? '#9ca3af' : '#374151'
                        }}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                  
                  {threads.length === 0 ? (
                    <div className="no-mails">No emails found</div>
                  ) : (
                    sortedGroups.map(([group, groupThreads]) => (
                <div key={group}>
                  <div className="mail-group-header">{group}</div>
                  {groupThreads.map((thread) => {
                    const lastMessage = thread.messages[thread.messages.length - 1];
                    // Check if any message in thread is unread
                    const hasUnreadMessages = thread.messages.some(msg => !msg.isRead);
                    const isSelected = selectedThreadIds.includes(thread.trackingId);
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
                              
                              // First decode HTML entities
                              const textarea = document.createElement('textarea');
                              textarea.innerHTML = cleanText;
                              cleanText = textarea.value;
                              
                              // Remove style and script tags with their content
                              cleanText = cleanText
                                .replace(/<style[^>]*>.*?<\/style>/gis, '')
                                .replace(/<script[^>]*>.*?<\/script>/gis, '')
                                .replace(/<!--.*?-->/gs, '') // Remove HTML comments
                                .replace(/<head[^>]*>.*?<\/head>/gis, '') // Remove head section
                                .replace(/<[^>]+>/g, '') // Remove all HTML tags
                                .replace(/&nbsp;/gi, ' ')
                                .replace(/&gt;/g, '>')
                                .replace(/&lt;/g, '<')
                                .replace(/&amp;/g, '&')
                                .replace(/&quot;/g, '"')
                                .replace(/&#39;/g, "'")
                                .replace(/&#x[0-9A-Fa-f]+;/g, '') // Remove hex entities
                                .replace(/&#[0-9]+;/g, '') // Remove numeric entities
                                .replace(/\{[^}]*\}/g, '') // Remove anything in curly braces
                                .replace(/v\\:\*|o\\:\*|w\\:\*/g, '') // Remove VML namespace declarations
                                .replace(/behavior:url\([^)]*\)/g, '') // Remove behavior URLs
                                .replace(/mso-[^;:]*:[^;]*/gi, '') // Remove MS Office styles
                                .replace(/\s+/g, ' ') // Replace multiple spaces
                                .trim();
                              
                              // If text is still gibberish, empty, or too short
                              if (!cleanText || cleanText.length < 5 || /^[\W_\s]+$/.test(cleanText) || /^[v\\o\\w\\]/.test(cleanText)) {
                                return 'No preview available';
                              }
                              
                              // Return first 100 characters
                              return cleanText.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                    ))
                  )
                }
                </>
              )
            ) : activeTab === 'sent' ? (
              <SentTab 
                effectiveUserId={effectiveUserId} 
                token={token} 
                selectedInboxId={selectedInboxId}
                selectedProvider={selectedProvider}
                selectedThread={selectedSentThread}
                onThreadSelect={(thread) => {
                  setSelectedSentThread(thread);
                  setShowReplySection(false);
                  setReplyText('');
                }}
                onInitializeCollapsedEmails={(collapsed) => {
                  setCollapsedEmails(collapsed);
                }}
                onReplyReset={() => {
                  setShowReplySection(false);
                  setReplyText('');
                }}
                refreshTrigger={refreshSentTab}
              />
            ) : activeTab === 'unassigned' ? (
              <UnassignedTab 
                effectiveUserId={effectiveUserId} 
                token={token} 
                selectedInboxId={selectedInboxId}
                selectedProvider={selectedProvider}
                onEmailSelect={(email) => {
                  setSelectedUnassignedEmail(email);
                  setShowReplySection(false);
                  setReplyText('');
                }}
                selectedEmail={selectedUnassignedEmail}
                selectedThread={selectedUnassignedThread}
                onThreadSelect={(thread) => {
                  setSelectedUnassignedThread(thread);
                  setShowReplySection(false);
                  setReplyText('');
                }}
                onInitializeCollapsedEmails={(collapsed) => {
                  setCollapsedEmails(collapsed);
                }}
                onReplyReset={() => {
                  setShowReplySection(false);
                  setReplyText('');
                }}
                refreshTrigger={refreshUnassignedTab}
              />
            ) : (
              <AllMessagesTab 
                effectiveUserId={effectiveUserId} 
                token={token} 
                selectedInboxId={selectedInboxId}
                selectedProvider={selectedProvider}
                selectedThread={selectedAllMessagesThread}
                onThreadSelect={(thread) => {
                  console.log('All Messages Thread Selected:', thread);
                  console.log('Contact ID:', thread?.contactId);
                  setSelectedAllMessagesThread(thread);
                  setShowReplySection(false);
                  setReplyText('');
                }}
                onInitializeCollapsedEmails={(collapsed) => {
                  setCollapsedEmails(collapsed);
                }}
                onReplyReset={() => {
                  setShowReplySection(false);
                  setReplyText('');
                }}
                refreshTrigger={refreshAllMessagesTab}
              />
            )}
            </div>
          </div>
          
          {/* Mail Detail - Right side - conditional based on active tab */}
          {activeTab === 'inbox' ? (
            selectedThread ? (
            <div className="mail-detail">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0', marginBottom: '24px' }}>
                <h3 className="mail-detail-subject" style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>{selectedThread.subject}</h3>
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
                      right: 0,
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
                          setDeleteModalType('single');
                          setPendingDeleteMode('soft');
                          setShowDeleteModal(true);
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
                          setDeleteModalType('single');
                          setPendingDeleteMode('Permanent');
                          setShowDeleteModal(true);
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
              </div>
              
              {/* Sort messages by date - latest first, oldest last */}
              {[...selectedThread.messages].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              ).map((message, index, sortedMessages) => {
                const messageContactId = message.type === 'Reply' ? message.contactId : null;
                const uniqueKey = `${message.messageId}-${index}`;
                console.log('Message type:', message.type, 'contactId:', messageContactId);
                return (
                <div key={uniqueKey} style={{ marginBottom: index < sortedMessages.length - 1 ? '24px' : '0', paddingBottom: index < sortedMessages.length - 1 ? '24px' : '0', borderBottom: index < sortedMessages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <div className="mail-detail-header">
                    <div className="mail-detail-top">
                      <div className="mail-detail-avatar">{getInitials(message.fromEmail, message.contactName)}</div>
                      <div className="mail-detail-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div 
                            className="mail-detail-sender"
                            style={{
                              cursor: messageContactId ? 'pointer' : 'default',
                              color: messageContactId ? '#3f9f42' : '#1f2937',
                              textDecoration: messageContactId ? 'underline' : 'none',
                              fontWeight: '500',
                              fontSize: '14px'
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
                            {message.contactName || extractSenderName(message.fromEmail)}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          {extractEmailAddress(message.fromEmail)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <span style={{ color: '#6b7280', fontSize: '13px' }}>To:</span>
                          <span style={{ color: '#2563eb', fontSize: '13px' }}>
                            {extractEmailAddress(message.toEmail || selectedThread.contactEmail)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMessageExpand(message.messageId);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              fontSize: '10px',
                              color: '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              marginLeft: '4px'
                            }}
                          >
                            <span style={{
                              transform: expandedMessages[message.messageId] ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                              display: 'inline-block'
                            }}>▼</span>
                          </button>
                        </div>
                        {expandedMessages[message.messageId] && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px 0',
                            fontSize: '13px',
                            lineHeight: '1.8',
                            color: '#6b7280',
                            borderTop: '1px solid #e5e7eb'
                          }}>
                            <div>
                              <strong style={{ color: '#374151' }}>From:</strong> {message.contactName || extractSenderName(message.fromEmail)} &lt;{extractEmailAddress(message.fromEmail)}&gt;
                            </div>
                            <div>
                              <strong style={{ color: '#374151' }}>To:</strong> {extractEmailAddress(message.toEmail || selectedThread.contactEmail)}
                            </div>
                            <div>
                              <strong style={{ color: '#374151' }}>Date:</strong> {formatFullDate(message.date)}
                            </div>
                            <div>
                              <strong style={{ color: '#374151' }}>Subject:</strong> {message.subject}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mail-detail-date">{new Date(message.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                    </div>
                  </div>
                  {collapsedEmails[uniqueKey] ? (
                    <div 
                      className="mail-body-preview" 
                      onClick={() => toggleEmailCollapse(uniqueKey)}
                      style={{ 
                        padding: '16px 24px',
                        cursor: 'pointer',
                        color: '#6b7280',
                        fontSize: '14px',
                        borderLeft: '3px solid #e5e7eb',
                        background: '#f9fafb',
                        borderRadius: '4px',
                        margin: '0 24px'
                      }}
                    >
                      {(() => {
                        let cleanText = message.body;
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
                        
                        // Get only the first line
                        const lines = cleanText.split(/[\r\n]+/).filter(line => line.trim());
                        const firstLine = lines[0] || cleanText.substring(0, 100);
                        return firstLine.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
                      })()}
                    </div>
                  ) : (
                    <div 
                      onClick={() => toggleEmailCollapse(uniqueKey)} 
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="mail-body" dangerouslySetInnerHTML={{ __html: formatEmailBody(message.body) }} style={{ maxWidth: '100%', overflowX: 'auto' }} />
                    </div>
                  )}
                </div>
              );})}
              
              {/* Reply Button */}
              {!showReplySection && (
                <div className="reply-button-sticky">
                  <button
                    onClick={() => setShowReplySection(true)}
                    style={{
                      padding: '10px 24px',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    Reply
                  </button>
                </div>
              )}
              
              {/* Reply Section */}
              {showReplySection && (
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

                    <button 
                      className="button square-40 justify-center" 
                      style={{ 
                        background: isSavingDraft || !replyText.trim() ? '#ccc' : '#3f9f42', 
                        color: '#fff',
                        fontWeight: '500',
                        fontSize: '13px',
                        padding: '0 16px',
                        width: 'auto',
                        minWidth: '70px',
                        cursor: isSavingDraft || !replyText.trim() ? 'not-allowed' : 'pointer'
                      }}
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft || !replyText.trim()}
                    >
                      {isSavingDraft ? 'Saving...' : 'Save'}
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
                <div style={{ display: 'flex', gap: '12px' }}>
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
                  <button
                    onClick={() => {
                      setShowReplySection(false);
                      setReplyText('');
                    }}
                    style={{
                      padding: '10px 24px',
                      background: '#6b7280',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              )}
            </div>
          ) : null
          ) : (
            selectedSentThread ? (
              <div className="mail-detail">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0', marginBottom: '24px' }}>
                  <h3 className="mail-detail-subject" style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                    {selectedSentThread.subject}
                  </h3>
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
                        right: 0,
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
                            setDeleteModalType('single');
                            setPendingDeleteMode('soft');
                            setShowDeleteModal(true);
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
                            setDeleteModalType('single');
                            setPendingDeleteMode('Permanent');
                            setShowDeleteModal(true);
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
                </div>

                {/* Sort messages by date - latest first, oldest last */}
                {[...selectedSentThread.messages].sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                ).map((message, index, sortedMessages) => {
                  const uniqueKey = `sent-${message.messageId}-${index}`;
                  return (
                  <div key={uniqueKey} style={{ marginBottom: index < sortedMessages.length - 1 ? '24px' : '0', paddingBottom: index < sortedMessages.length - 1 ? '24px' : '0', borderBottom: index < sortedMessages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <div className="mail-detail-header">
                      <div className="mail-detail-top">
                        <div className="mail-detail-avatar">{getInitials(message.fromEmail, message.contactName)}</div>
                        <div className="mail-detail-info" style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div 
                              className="mail-detail-sender"
                              style={{
                                cursor: message.contactId ? 'pointer' : 'default',
                                color: message.contactId ? '#3f9f42' : '#1f2937',
                                textDecoration: message.contactId ? 'underline' : 'none',
                                fontWeight: '500',
                                fontSize: '14px'
                              }}
                              onClick={(e) => {
                                if (message.contactId) {
                                  e.stopPropagation();
                                  const clientId = sessionStorage.getItem('clientId') || '';
                                  const contactDetailsUrl = `/#/contact-details/${message.contactId}?tab=Output&clientId=${clientId}`;
                                  window.open(contactDetailsUrl, '_blank');
                                }
                              }}
                            >
                              {message.contactName || extractSenderName(message.fromEmail)}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            {extractEmailAddress(message.fromEmail)}
                          </div>
                        </div>
                        <div className="mail-detail-date">{new Date(message.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                      </div>
                    </div>
                    {collapsedEmails[uniqueKey] ? (
                      <div 
                        className="mail-body-preview" 
                        onClick={() => toggleEmailCollapse(uniqueKey)}
                        style={{ 
                          padding: '16px 24px',
                          cursor: 'pointer',
                          color: '#6b7280',
                          fontSize: '14px',
                          borderLeft: '3px solid #e5e7eb',
                          background: '#f9fafb',
                          borderRadius: '4px',
                          margin: '0 24px'
                        }}
                      >
                        {(() => {
                          let cleanText = message.body;
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
                          
                          const lines = cleanText.split(/[\r\n]+/).filter(line => line.trim());
                          const firstLine = lines[0] || cleanText.substring(0, 100);
                          return firstLine.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
                        })()}
                      </div>
                    ) : (
                      <div 
                        onClick={() => toggleEmailCollapse(uniqueKey)} 
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="mail-body" dangerouslySetInnerHTML={{ __html: formatEmailBody(message.body) }} style={{ maxWidth: '100%', overflowX: 'auto' }} />
                      </div>
                    )}
                  </div>
                );})}
              </div>
            ) : selectedUnassignedThread ? (
              <div className="mail-detail">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0', marginBottom: '24px' }}>
                  <h3 className="mail-detail-subject" style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                    {selectedUnassignedThread.subject}
                  </h3>
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
                        right: 0,
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
                            setDeleteModalType('single');
                            setPendingDeleteMode('soft');
                            setShowDeleteModal(true);
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
                            setDeleteModalType('single');
                            setPendingDeleteMode('Permanent');
                            setShowDeleteModal(true);
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
                </div>

                {/* Sort messages by date - latest first, oldest last */}
                {[...selectedUnassignedThread.messages].sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                ).map((message, index, sortedMessages) => {
                  const uniqueKey = `unassigned-${message.messageId}-${index}`;
                  return (
                  <div key={uniqueKey} style={{ marginBottom: index < sortedMessages.length - 1 ? '24px' : '0', paddingBottom: index < sortedMessages.length - 1 ? '24px' : '0', borderBottom: index < sortedMessages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <div className="mail-detail-header">
                      <div className="mail-detail-top">
                        <div className="mail-detail-avatar">{getInitials(message.fromEmail, message.contactName)}</div>
                        <div className="mail-detail-info" style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div 
                              className="mail-detail-sender"
                              style={{
                                cursor: message.contactId ? 'pointer' : 'default',
                                color: message.contactId ? '#3f9f42' : '#1f2937',
                                textDecoration: message.contactId ? 'underline' : 'none',
                                fontWeight: '500',
                                fontSize: '14px'
                              }}
                              onClick={(e) => {
                                if (message.contactId) {
                                  e.stopPropagation();
                                  const clientId = sessionStorage.getItem('clientId') || '';
                                  const contactDetailsUrl = `/#/contact-details/${message.contactId}?tab=Output&clientId=${clientId}`;
                                  window.open(contactDetailsUrl, '_blank');
                                }
                              }}
                            >
                              {message.contactName || extractSenderName(message.fromEmail)}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            {extractEmailAddress(message.fromEmail)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <span style={{ color: '#6b7280', fontSize: '13px' }}>To:</span>
                            <span style={{ color: '#2563eb', fontSize: '13px' }}>
                              {extractEmailAddress(message.toEmail || selectedUnassignedThread.contactEmail)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMessageExpand(message.messageId);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                fontSize: '10px',
                                color: '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '4px'
                              }}
                            >
                              <span style={{
                                transform: expandedMessages[message.messageId] ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                display: 'inline-block'
                              }}>▼</span>
                            </button>
                          </div>
                          {expandedMessages[message.messageId] && (
                            <div style={{
                              marginTop: '8px',
                              padding: '8px 0',
                              fontSize: '13px',
                              lineHeight: '1.8',
                              color: '#6b7280',
                              borderTop: '1px solid #e5e7eb'
                            }}>
                              <div>
                                <strong style={{ color: '#374151' }}>From:</strong> {message.contactName || extractSenderName(message.fromEmail)} &lt;{extractEmailAddress(message.fromEmail)}&gt;
                              </div>
                              <div>
                                <strong style={{ color: '#374151' }}>To:</strong> {extractEmailAddress(message.toEmail || selectedUnassignedThread.contactEmail)}
                              </div>
                              <div>
                                <strong style={{ color: '#374151' }}>Date:</strong> {formatFullDate(message.date)}
                              </div>
                              <div>
                                <strong style={{ color: '#374151' }}>Subject:</strong> {message.subject}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mail-detail-date">{new Date(message.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                      </div>
                    </div>
                    {collapsedEmails[uniqueKey] ? (
                      <div 
                        className="mail-body-preview" 
                        onClick={() => toggleEmailCollapse(uniqueKey)}
                        style={{ 
                          padding: '16px 24px',
                          cursor: 'pointer',
                          color: '#6b7280',
                          fontSize: '14px',
                          borderLeft: '3px solid #e5e7eb',
                          background: '#f9fafb',
                          borderRadius: '4px',
                          margin: '0 24px'
                        }}
                      >
                        {(() => {
                          let cleanText = message.body;
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
                          
                          const lines = cleanText.split(/[\r\n]+/).filter(line => line.trim());
                          const firstLine = lines[0] || cleanText.substring(0, 100);
                          return firstLine.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
                        })()}
                      </div>
                    ) : (
                      <div 
                        onClick={() => toggleEmailCollapse(uniqueKey)} 
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="mail-body" dangerouslySetInnerHTML={{ __html: formatEmailBody(message.body) }} style={{ maxWidth: '100%', overflowX: 'auto' }} />
                      </div>
                    )}
                  </div>
                );})}
                
                {/* Reply Button */}
                {!showReplySection && (
                  <div className="reply-button-sticky">
                    <button
                      onClick={() => setShowReplySection(true)}
                      style={{
                        padding: '10px 24px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                      Reply
                    </button>
                  </div>
                )}
                
                {/* Reply Section */}
                {showReplySection && (
                <div className="reply-section" style={{
                  marginTop: '24px',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '24px',
                  padding: '24px'
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
                        onClick={async () => {
                          if (!selectedBlueprint || !selectedUnassignedThread.contactId) return;
                          
                          setIsKrafting(true);
                          setError('');
                          try {
                            const response = await axios.post(
                              `${API_BASE_URL}/api/CampaignPrompt/campaign/generate-single-contact`,
                              {
                                blueprintId: selectedBlueprint,
                                contactId: selectedUnassignedThread.contactId,
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
                        }}
                        disabled={!selectedBlueprint || isKrafting || !selectedUnassignedThread.contactId}
                        style={{
                          padding: '6px 16px',
                          background: (!selectedBlueprint || isKrafting || !selectedUnassignedThread.contactId) ? '#ccc' : '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (!selectedBlueprint || isKrafting || !selectedUnassignedEmail.contactId) ? 'not-allowed' : 'pointer',
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
                    
                    {/* Toolbar */}
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

                      <button 
                        className="button square-40 justify-center" 
                        style={{ 
                          background: isSavingDraft || !replyText.trim() || !selectedUnassignedThread.contactId ? '#ccc' : '#3f9f42', 
                          color: '#fff',
                          fontWeight: '500',
                          fontSize: '13px',
                          padding: '0 16px',
                          width: 'auto',
                          minWidth: '70px',
                          cursor: isSavingDraft || !replyText.trim() || !selectedUnassignedThread.contactId ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft || !replyText.trim() || !selectedUnassignedThread.contactId}
                      >
                        {isSavingDraft ? 'Saving...' : 'Save'}
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
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={async () => {
                        if (!replyText.trim()) return;
                        
                        const emailTrackingId = selectedUnassignedThread.trackingId;
                        
                        if (!emailTrackingId) {
                          setToastMessage('Cannot reply: No tracking ID available');
                          setToastType('error');
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                          return;
                        }
                        
                        setIsSending(true);
                        setError('');
                        try {
                          const response = await axios.post(
                            `${API_BASE_URL}/api/email/reply_email`,
                            {
                              trackingId: emailTrackingId,
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
                            // Add the sent message to the thread immediately
                            const sentMessage: InboxMessage = {
                              type: 'Sent',
                              messageId: `temp-${Date.now()}`,
                              subject: `Re: ${selectedUnassignedThread.subject}`,
                              body: replyText,
                              fromEmail: inboxList.find(i => i.inboxId === selectedInboxId)?.emailAddress || '',
                              toEmail: selectedUnassignedThread.contactEmail,
                              date: new Date().toISOString(),
                              isRead: true,
                              contactId: selectedUnassignedThread.contactId,
                              contactName: null
                            };
                            
                            // Update the thread with the new message
                            const updatedThread = {
                              ...selectedUnassignedThread,
                              messages: [...selectedUnassignedThread.messages, sentMessage],
                              totalMessages: selectedUnassignedThread.totalMessages + 1,
                              lastMessageDate: sentMessage.date
                            };
                            
                            setSelectedUnassignedThread(updatedThread);
                            setReplyText('');
                            setShowReplySection(false);
                            setToastMessage('Reply sent successfully!');
                            setToastType('success');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          } else {
                            setToastMessage('Failed to send reply');
                            setToastType('error');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          }
                        } catch (err: any) {
                          console.error('Error sending reply:', err);
                          setToastMessage(err.response?.data?.message || 'Failed to send reply');
                          setToastType('error');
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                        } finally {
                          setIsSending(false);
                        }
                      }}
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
                    <button
                      onClick={() => {
                        setShowReplySection(false);
                        setReplyText('');
                      }}
                      style={{
                        padding: '10px 24px',
                        background: '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                )}
              </div>
            ) : selectedAllMessagesThread ? (
              <div className="mail-detail">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0', marginBottom: '24px' }}>
                  <h3 className="mail-detail-subject" style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                    {selectedAllMessagesThread.subject}
                  </h3>
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
                        right: 0,
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
                            setDeleteModalType('single');
                            setPendingDeleteMode('soft');
                            setShowDeleteModal(true);
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
                            setDeleteModalType('single');
                            setPendingDeleteMode('Permanent');
                            setShowDeleteModal(true);
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
                </div>

                {/* Sort messages by date - latest first, oldest last */}
                {[...selectedAllMessagesThread.messages].sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                ).map((message, index, sortedMessages) => {
                  const uniqueKey = `all-${message.messageId}-${index}`;
                  return (
                  <div key={uniqueKey} style={{ marginBottom: index < sortedMessages.length - 1 ? '24px' : '0', paddingBottom: index < sortedMessages.length - 1 ? '24px' : '0', borderBottom: index < sortedMessages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <div className="mail-detail-header">
                      <div className="mail-detail-top">
                        <div className="mail-detail-avatar">{getInitials(message.fromEmail, message.contactName)}</div>
                        <div className="mail-detail-info" style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div 
                              className="mail-detail-sender"
                              style={{
                                cursor: message.contactId ? 'pointer' : 'default',
                                color: message.contactId ? '#3f9f42' : '#1f2937',
                                textDecoration: message.contactId ? 'underline' : 'none',
                                fontWeight: '500',
                                fontSize: '14px'
                              }}
                              onClick={(e) => {
                                if (message.contactId) {
                                  e.stopPropagation();
                                  const clientId = sessionStorage.getItem('clientId') || '';
                                  const contactDetailsUrl = `/#/contact-details/${message.contactId}?tab=Output&clientId=${clientId}`;
                                  window.open(contactDetailsUrl, '_blank');
                                }
                              }}
                            >
                              {message.contactName || extractSenderName(message.fromEmail)}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            {extractEmailAddress(message.fromEmail)}
                          </div>
                        </div>
                        <div className="mail-detail-date">{new Date(message.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                      </div>
                    </div>
                    {collapsedEmails[uniqueKey] !== false ? (
                      <div 
                        className="mail-body-preview" 
                        onClick={() => toggleEmailCollapse(uniqueKey)}
                        style={{ 
                          padding: '16px 24px',
                          cursor: 'pointer',
                          color: '#6b7280',
                          fontSize: '14px',
                          borderLeft: '3px solid #e5e7eb',
                          background: '#f9fafb',
                          borderRadius: '4px',
                          margin: '0 24px'
                        }}
                      >
                        {(() => {
                          let cleanText = message.body;
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
                          
                          const lines = cleanText.split(/[\r\n]+/).filter(line => line.trim());
                          const firstLine = lines[0] || cleanText.substring(0, 100);
                          return firstLine.substring(0, 100) + (cleanText.length > 100 ? '...' : '');
                        })()}
                      </div>
                    ) : (
                      <div 
                        onClick={() => toggleEmailCollapse(uniqueKey)} 
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="mail-body" dangerouslySetInnerHTML={{ __html: formatEmailBody(message.body) }} style={{ maxWidth: '100%', overflowX: 'auto' }} />
                      </div>
                    )}
                  </div>
                );})}

                {/* Reply Button */}
                {!showReplySection && (
                  <div className="reply-button-sticky">
                    <button
                      onClick={() => setShowReplySection(true)}
                      style={{
                        padding: '10px 24px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                      </svg>
                      Reply
                    </button>
                  </div>
                )}

                {/* Reply Section */}
                {showReplySection && (
                <div className="reply-section" style={{
                  marginTop: '24px',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '24px',
                  padding: '24px'
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
                        onClick={async () => {
                          if (!selectedBlueprint || !selectedAllMessagesThread.contactId) return;

                          setIsKrafting(true);
                          setError('');
                          try {
                            const response = await axios.post(
                              `${API_BASE_URL}/api/CampaignPrompt/campaign/generate-single-contact`,
                              {
                                blueprintId: selectedBlueprint,
                                contactId: selectedAllMessagesThread.contactId,
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
                        }}
                        disabled={!selectedBlueprint || isKrafting || !selectedAllMessagesThread.contactId}
                        style={{
                          padding: '6px 16px',
                          background: (!selectedBlueprint || isKrafting || !selectedAllMessagesThread.contactId) ? '#ccc' : '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (!selectedBlueprint || isKrafting || !selectedAllMessagesThread.contactId) ? 'not-allowed' : 'pointer',
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

                    {/* Toolbar */}
                    <div className="output-email-floated-icons d-flex bg-[#ffffff] rounded-md" style={{ position: 'absolute', right: '10px', top: '10px', zIndex: 10 }}>
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

                      <button
                        className="button square-40 justify-center"
                        style={{
                          background: isSavingDraft || !replyText.trim() || !selectedAllMessagesThread.contactId ? '#ccc' : '#3f9f42',
                          color: '#fff',
                          fontWeight: '500',
                          fontSize: '13px',
                          padding: '0 16px',
                          width: 'auto',
                          minWidth: '70px',
                          cursor: isSavingDraft || !replyText.trim() || !selectedAllMessagesThread.contactId ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft || !replyText.trim() || !selectedAllMessagesThread.contactId}
                      >
                        {isSavingDraft ? 'Saving...' : 'Save'}
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
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={async () => {
                        if (!replyText.trim()) return;

                        const emailTrackingId = selectedAllMessagesThread.trackingId;

                        if (!emailTrackingId) {
                          setToastMessage('Cannot reply: No tracking ID available');
                          setToastType('error');
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                          return;
                        }

                        setIsSending(true);
                        setError('');
                        try {
                          const response = await axios.post(
                            `${API_BASE_URL}/api/email/reply_email`,
                            {
                              trackingId: emailTrackingId,
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
                            const sentMessage: InboxMessage = {
                              type: 'Sent',
                              messageId: `temp-${Date.now()}`,
                              subject: `Re: ${selectedAllMessagesThread.subject}`,
                              body: replyText,
                              fromEmail: inboxList.find(i => i.inboxId === selectedInboxId)?.emailAddress || '',
                              toEmail: selectedAllMessagesThread.contactEmail,
                              date: new Date().toISOString(),
                              isRead: true,
                              contactId: selectedAllMessagesThread.contactId,
                              contactName: null
                            };

                            const updatedThread = {
                              ...selectedAllMessagesThread,
                              messages: [...selectedAllMessagesThread.messages, sentMessage],
                              totalMessages: selectedAllMessagesThread.totalMessages + 1,
                              lastMessageDate: sentMessage.date
                            };

                            setSelectedAllMessagesThread(updatedThread);
                            setRefreshAllMessagesTab(prev => prev + 1);
                            setReplyText('');
                            setShowReplySection(false);
                            setToastMessage('Reply sent successfully!');
                            setToastType('success');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          } else {
                            setToastMessage('Failed to send reply');
                            setToastType('error');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                          }
                        } catch (err: any) {
                          console.error('Error sending reply:', err);
                          setToastMessage(err.response?.data?.message || 'Failed to send reply');
                          setToastType('error');
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                        } finally {
                          setIsSending(false);
                        }
                      }}
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
                    <button
                      onClick={() => {
                        setShowReplySection(false);
                        setReplyText('');
                      }}
                      style={{
                        padding: '10px 24px',
                        background: '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                )}
              </div>
            ) : null
          )}
          
          {/* Right Side Panel - Contact Info */}
          {(() => {
            const showPanel = (
              (activeTab === 'inbox' && selectedThread?.contactId) || 
              (activeTab === 'sent' && selectedSentThread?.contactId) || 
              (activeTab === 'unassigned' && selectedUnassignedThread?.contactId) ||
              (activeTab === 'all' && selectedAllMessagesThread?.contactId) ||
              (activeTab === 'allmessages' && selectedAllMessagesThread?.contactId)
            );
            
            console.log('Contact Panel Check:', {
              activeTab,
              showPanel,
              inboxContactId: selectedThread?.contactId,
              sentContactId: selectedSentThread?.contactId,
              unassignedContactId: selectedUnassignedThread?.contactId,
              allMessagesContactId: selectedAllMessagesThread?.contactId
            });
            
            return showPanel ? (
              <div style={{
                width: '350px',
                borderLeft: '1px solid #e5e7eb',
                background: '#fff',
                overflowY: 'auto',
                flexShrink: 0,
                marginRight: '-35px',
                marginTop: '24px'
              }}>
                <ContactInfoPanel 
                  contactId={
                    activeTab === 'inbox' ? selectedThread?.contactId || null
                    : activeTab === 'sent' ? selectedSentThread?.contactId || null
                    : activeTab === 'unassigned' ? selectedUnassignedThread?.contactId || null
                    : selectedAllMessagesThread?.contactId || null
                  }
                  token={token}
                />
              </div>
            ) : null;
          })()}
        </div>

      {/* Custom Delete Modal - App Based Popup */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => {
            setShowDeleteModal(false);
            setShowDeleteDropdown(false);
            setShowBulkDeleteDropdown(false);
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '0',
              width: '90%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'slideIn 0.2s ease-out',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px 24px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: pendingDeleteMode === 'Permanent' ? '#fee2e2' : '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={pendingDeleteMode === 'Permanent' ? '#ef4444' : '#f59e0b'} strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                  </svg>
                </div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  margin: 0,
                  color: '#111827'
                }}>
                  {pendingDeleteMode === 'Permanent' ? 'Delete Permanently?' : 'Delete Email?'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setShowDeleteDropdown(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  color: '#9ca3af',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              <p style={{ 
                fontSize: '15px', 
                color: '#4b5563', 
                marginBottom: '20px',
                lineHeight: '1.6'
              }}>
                {deleteModalType === 'bulk' 
                  ? `You are about to delete ${selectedThreadIds.length} email${selectedThreadIds.length > 1 ? 's' : ''} from your inbox.`
                  : 'You are about to delete 1 email from your inbox.'
                }
              </p>

              {pendingDeleteMode === 'Permanent' && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '6px',
                  marginBottom: '20px'
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#991b1b',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    ⚠️ Warning: This action is irreversible!
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setShowDeleteDropdown(false);
                    setShowBulkDeleteDropdown(false);
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#f9fafb',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    flex: 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setShowDeleteDropdown(false);
                    setShowBulkDeleteDropdown(false);
                    if (deleteModalType === 'bulk') {
                      handleBulkDelete(pendingDeleteMode);
                    } else {
                      handleDeleteEmail(pendingDeleteMode);
                    }
                  }}
                  style={{
                    padding: '12px 24px',
                    background: pendingDeleteMode === 'Permanent' ? '#ef4444' : '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = pendingDeleteMode === 'Permanent' ? '#dc2626' : '#d97706';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = pendingDeleteMode === 'Permanent' ? '#ef4444' : '#f59e0b';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                  {pendingDeleteMode === 'Permanent' ? 'Delete Permanently' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};

export default InboxView;
