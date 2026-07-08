
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../../../config';
import LoadingSpinner from '../../common/LoadingSpinner';
import CreditCheckModal from '../../common/CreditCheckModal';
import { useCreditCheck } from '../../../hooks/useCreditCheck';
import { useSoundAlert } from '../../common/useSoundAlert';
import RichTextEditor from '../../common/RTEEditor';
import DeleteConfirmationModal from '../../common/DeleteConfirmationModal';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { copyToClipboard } from '../../../utils/utils';
import Modal from '../../common/Modal';
import ToastMessage from '../../common/ToastMessage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';
import { faCaretDown, faEllipsisV, faFloppyDisk, faPaperclip, faReply, faShare } from '@fortawesome/free-solid-svg-icons';
import { Pin, PinOff, X } from 'lucide-react';
import UnassignedTab from './UnassignedTab';
import SentTab from './SentTab';
import AllMessagesTab from './AllMessagesTab';
import ContactInfoPanel from './ContactInfoPanel';
import EmailIframe from './EmailIframe';
import { isThreadPinned, pinEmail } from './inboxPin';
import { InboxEmptyState, InboxSelectState } from './Inbox.new';
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

interface SelectedInboxUnreadCounts {
  associated: number;
  external: number;
  allMessages: number;
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
  attachments?: InboxAttachment[];
}

interface InboxAttachment {
  id?: number;
  messageId?: string;
  fileName?: string;
  originalFileName?: string;
  contentType?: string;
  filePath?: string;
  fileSize?: number;
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

interface InboxViewProps {
  effectiveUserId: string;
  token: string | null;
  isVisible: boolean;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  onSelectedInboxUnreadCountsChange?: (counts: SelectedInboxUnreadCounts) => void;
}

const InboxView: React.FC<InboxViewProps> = ({ effectiveUserId, token, isVisible, initialTab = 'Inbox', onTabChange, onSelectedInboxUnreadCountsChange }) => {
  const primarySoftButtonStyle: React.CSSProperties = {
    background: '#e2f1e3',
    color: '#3f9f42',
    border: '1px solid #cfecd6'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    background: '#f8fafc',
    color: '#374151',
    border: '1px solid #d1d5db'
  };

  const navigate = useNavigate();
  const goToInboxConfiguration = () => {
    navigate('/main?tab=Mail&mailSubTab=Configuration');
  };

  const lastSelectedInboxStorageKey = `lastSelectedInbox:${effectiveUserId || 'default'}`;
  const [inboxList, setInboxList] = useState<InboxDropdownItem[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<InboxThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [replyText, setReplyText] = useState<string>('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [replyCc, setReplyCc] = useState<string>('');
  const [replyBcc, setReplyBcc] = useState<string>('');
  const [showReplyCc, setShowReplyCc] = useState(false);
  const [showReplyBcc, setShowReplyBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [blueprints, setBlueprints] = useState<BlueprintTemplate[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<number | null>(null);
  const [isKrafting, setIsKrafting] = useState(false);
  const kraftInFlightRef = useRef(false);
  const [forceShowCreditModal, setForceShowCreditModal] = useState(false);
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
  const [showForwardSection, setShowForwardSection] = useState(false);
  const [collapsedEmails, setCollapsedEmails] = useState<{ [key: string]: boolean }>({});
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);
  const mailDetailRef = useRef<HTMLDivElement>(null);
  const [showBulkDeleteDropdown, setShowBulkDeleteDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'unassigned' | 'all' | 'allmessages'>(initialTab.toLowerCase() as 'inbox' | 'sent' | 'unassigned' | 'all' | 'allmessages');
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardBccEmail, setForwardBccEmail] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');
  const [forwardTrackingId, setForwardTrackingId] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const [showForwardBcc, setShowForwardBcc] = useState(false);
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  const inboxFetchRequestRef = useRef(0);
  const { credits, showCreditModal, checkUserCredits, closeCreditModal, handleSkipModal } = useCreditCheck();
  const isDemoAccount = sessionStorage.getItem('isDemoAccount') === 'true';
  const { playSound } = useSoundAlert();

  const canGenerateFromCreditResponse = (creditResponse: any) => {
    if (typeof creditResponse === 'number') {
      return creditResponse > 0;
    }

    if (creditResponse && typeof creditResponse === 'object') {
      const totalCredits = Number(creditResponse.total ?? 0);
      return creditResponse.canGenerate !== false && totalCredits > 0;
    }

    return false;
  };

  const ensureCanKraft = async () => {
    if (isDemoAccount) {
      return true;
    }

    const currentCredits = await checkUserCredits(effectiveUserId);
    const canKraft = canGenerateFromCreditResponse(currentCredits);

    if (!canKraft) {
      setForceShowCreditModal(true);
    }

    return canKraft;
  };
  
  useEffect(() => {
    setActiveTab(initialTab.toLowerCase() as 'inbox' | 'sent' | 'unassigned' | 'all' | 'allmessages');
    // Clear all selections when tab changes
    setSelectedThread(null);
    setSelectedSentThread(null);
    setSelectedUnassignedThread(null);
    setSelectedAllMessagesThread(null);
    setShowReplySection(false);
    setShowForwardSection(false);
    setReplyText('');
    setReplyAttachments([]);
    setReplyCc('');
    setReplyBcc('');
    setShowReplyCc(false);
    setShowReplyBcc(false);
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
    setShowForwardSection(false);
    setReplyText('');
    setReplyAttachments([]);
    setReplyCc('');
    setReplyBcc('');
    setShowReplyCc(false);
    setShowReplyBcc(false);
    setCollapsedEmails({});
    
    // Force refresh AllMessages tab when switching to it
    if (tab === 'allmessages' || tab === 'all') {
      setRefreshAllMessagesTab(prev => prev + 1);
    }
    
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
  const [pinningThreadId, setPinningThreadId] = useState<string | null>(null);
  const [activeActionThreadId, setActiveActionThreadId] = useState<string | null>(null);
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<string | null>(null);
  const replyTrailMarker = 'data-reply-email-trail="true"';
  const replyTrailTrackingId = activeTab === 'inbox'
    ? selectedThread?.trackingId
    : activeTab === 'sent'
      ? selectedSentThread?.trackingId
      : activeTab === 'unassigned'
        ? selectedUnassignedThread?.trackingId
        : selectedAllMessagesThread?.trackingId;

  useEffect(() => {
    setShowForwardSection(false);
    setForwardEmail('');
    setForwardBccEmail('');
    setForwardMessage('');
    setForwardTrackingId('');
    setShowForwardBcc(false);
    setReplyAttachments([]);
  }, [
    activeTab,
    selectedThread?.trackingId,
    selectedUnassignedThread?.trackingId,
    selectedAllMessagesThread?.trackingId
  ]);

  useEffect(() => {
    if (!showReplySection || !replyTrailTrackingId) {
      return;
    }

    let isCancelled = false;

    const fetchEmailTrail = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Inbox/email-trail?trackingId=${encodeURIComponent(replyTrailTrackingId)}`,
          {
            headers: {
              accept: '*/*',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!isCancelled) {
          const emailTrail = response.data?.emailTrail || '';
          console.log('=== RAW EMAIL TRAIL DATA ===');
          console.log(emailTrail);
          console.log('=== END RAW DATA ===');
          
          if (emailTrail) {
            const formattedTrail = formatReplyEmailTrail(emailTrail);
            console.log('=== FORMATTED EMAIL TRAIL ===');
            console.log(formattedTrail);
            console.log('=== END FORMATTED ===');
            
            setReplyText((currentReplyText) => {
              return appendReplyTrail(currentReplyText, formattedTrail);
            });
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error fetching email trail:', err);
        }
      }
    };

    fetchEmailTrail();

    return () => {
      isCancelled = true;
    };
  }, [showReplySection, replyTrailTrackingId, token]);

  // Auto-open contact panel when a thread is selected
  useEffect(() => {
    const hasThread = !!(selectedThread || selectedSentThread || selectedUnassignedThread || selectedAllMessagesThread);
    if (hasThread) setContactPanelOpen(true);
    else setContactPanelOpen(false);
  }, [selectedThread, selectedSentThread, selectedUnassignedThread, selectedAllMessagesThread]);

  const refreshInboxDropdownCounts = useCallback(async () => {
    if (!effectiveUserId || !isVisible) return;

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
      console.error('Error refreshing inbox unread counts:', err);
    }
  }, [effectiveUserId, isVisible, token]);

  useEffect(() => {
    if (!onSelectedInboxUnreadCountsChange) return;

    const selectedInbox = inboxList.find(
      (inbox) => inbox.inboxId === selectedInboxId && inbox.provider === selectedProvider
    ) || inboxList.find((inbox) => inbox.inboxId === selectedInboxId);

    onSelectedInboxUnreadCountsChange({
      associated: selectedInbox?.emailRepliesUnreadCount || 0,
      external: selectedInbox?.inboxEmailsUnreadCount || 0,
      allMessages: selectedInbox?.totalUnreadCount || 0,
    });
  }, [inboxList, selectedInboxId, selectedProvider, onSelectedInboxUnreadCountsChange]);

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
          const inboxes: InboxDropdownItem[] = response.data.data;
          setInboxList(inboxes);

          if (inboxes.length > 0 && !selectedInboxId) {
            let savedInbox: { inboxId?: number; provider?: string } | null = null;

            try {
              const savedValue = localStorage.getItem(lastSelectedInboxStorageKey);
              savedInbox = savedValue ? JSON.parse(savedValue) : null;
            } catch {
              savedInbox = null;
            }

            const matchingSavedInbox = savedInbox?.inboxId
              ? inboxes.find((inbox) =>
                  inbox.inboxId === savedInbox?.inboxId &&
                  (!savedInbox.provider || inbox.provider === savedInbox.provider)
                )
              : null;

            // Only auto-restore a previously selected inbox. If the user has
            // never picked one, leave the selection empty so the inbox-select
            // banner is shown and they can choose which inbox to open.
            if (matchingSavedInbox) {
              setSelectedInboxId(matchingSavedInbox.inboxId);
              setSelectedProvider(matchingSavedInbox.provider || '');
            }
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
  }, [effectiveUserId, token, isVisible, lastSelectedInboxStorageKey]);

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

  const fetchMails = useCallback(async (showLoader = true) => {
    if (activeTab !== 'inbox' || !selectedInboxId || !isVisible) return;
    const requestId = ++inboxFetchRequestRef.current;

    if (showLoader) {
      setLoading(true);
    }
    setError('');
    try {
      const fetchPage = (pageNumber: number) => axios.get(
        `${API_BASE_URL}/api/Inbox/inbox?inboxId=${selectedInboxId}&clientId=${encodeURIComponent(effectiveUserId)}&Provider=${selectedProvider}&pageNumber=${pageNumber}&pageSize=${inboxPageSize}&_=${Date.now()}`,
        {
          headers: {
            accept: '*/*',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          timeout: 30000,
        }
      );

      const response = await fetchPage(inboxCurrentPage);
      if (requestId !== inboxFetchRequestRef.current) return;

      if (response.data.success && response.data.data) {
        const pageThreads = Array.isArray(response.data.data.data) ? response.data.data.data : [];
        const nextTotalCount = response.data.data.totalCount || 0;
        const nextTotalPages = response.data.data.totalPages || 0;

        setThreads(pageThreads);
        setInboxTotalCount(nextTotalCount);
        setInboxTotalPages(nextTotalPages);
      } else {
        setThreads([]);
        setToastMessage('No emails found in this inbox');
        setToastType('info');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err: any) {
      if (requestId !== inboxFetchRequestRef.current) return;
      console.error('Error fetching mails:', err);
      setThreads([]);
      setToastMessage(err.response?.data?.message || 'Failed to load emails. Please try again.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      if (showLoader && requestId === inboxFetchRequestRef.current) {
        setLoading(false);
      }
    }
  }, [activeTab, selectedInboxId, selectedProvider, effectiveUserId, token, isVisible, inboxCurrentPage, inboxPageSize]);

  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchMails();
    }
  }, [fetchMails]);

  const handleInboxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    inboxFetchRequestRef.current += 1;
    
    // Clear selections immediately
    setSelectedThread(null);
    setSelectedUnassignedEmail(null);
    setSelectedUnassignedThread(null);
    setSelectedSentThread(null);
    setSelectedAllMessagesThread(null);
    setSelectedThreadIds([]);
    setHoveredThreadId(null);
    setShowDeleteDropdown(false);
    setShowBulkDeleteDropdown(false);
    setInboxCurrentPage(1);
    setInboxTotalCount(0);
    setInboxTotalPages(0);
    setThreads([]);

    if (!selectedValue) {
      setSelectedInboxId(null);
      setSelectedProvider('');
      localStorage.removeItem(lastSelectedInboxStorageKey);
      setLoading(false);
      return;
    }

    const inboxId = parseInt(selectedValue);
    const inbox = inboxList.find(i => i.inboxId === inboxId);
    
    // Update inbox immediately - fetchMails will be triggered by useEffect
    setSelectedInboxId(inboxId);
    const provider = inbox?.provider || '';
    setSelectedProvider(provider);
    localStorage.setItem(
      lastSelectedInboxStorageKey,
      JSON.stringify({ inboxId, provider })
    );
  };

  const fetchDefaultSignature = useCallback(async () => {
    if (!selectedInboxId || !selectedProvider) return '';
    
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
        return `<br/><br/>${response.data.signatureHtml}`;
      }
    } catch (err) {
      console.error('Error fetching signature:', err);
    }
    return '';
  }, [effectiveUserId, selectedInboxId, selectedProvider, token]);

  const handleThreadClick = async (thread: InboxThread) => {
    setSelectedThread(thread);
    setShowReplySection(false);
    setReplyText('');
    setSelectedUnassignedEmail(null);
    setSelectedUnassignedThread(null);
    
    // Keep the first displayed message expanded and collapse the rest.
    const collapsed: { [key: string]: boolean } = {};
    const sortedMessages = [...thread.messages].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    sortedMessages.forEach((message, index) => {
      const uniqueKey = `${message.messageId}-${index}`;
      collapsed[uniqueKey] = index !== 0;
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
        await refreshInboxDropdownCounts();
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

  const handleBulkDelete = async (deleteMode: 'soft' | 'Permanent') => {
    if (selectedThreadIds.length === 0) return;
    const trackingIdsToDelete = [...selectedThreadIds];
    
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
          if (selectedThread && trackingIdsToDelete.includes(selectedThread.trackingId)) {
            setSelectedThread(null);
          }
          await fetchMails(false);
        } else if (activeTab === 'sent') {
          if (selectedSentThread && trackingIdsToDelete.includes(selectedSentThread.trackingId)) {
            setSelectedSentThread(null);
          }
          setRefreshSentTab(prev => prev + 1);
        } else if (activeTab === 'unassigned') {
          if (selectedUnassignedThread && trackingIdsToDelete.includes(selectedUnassignedThread.trackingId)) {
            setSelectedUnassignedThread(null);
            setSelectedUnassignedEmail(null);
          }
          setRefreshUnassignedTab(prev => prev + 1);
        } else if (activeTab === 'all' || activeTab === 'allmessages') {
          if (selectedAllMessagesThread && trackingIdsToDelete.includes(selectedAllMessagesThread.trackingId)) {
            setSelectedAllMessagesThread(null);
          }
          setRefreshAllMessagesTab(prev => prev + 1);
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

        if (selectedThread?.trackingId === thread.trackingId) {
          setSelectedThread(prevThread => prevThread ? { ...prevThread, isPinned: nextPinned, isPin: nextPinned } : prevThread);
        }
      }
    } catch (err) {
      console.error('Error pinning email:', err);
    } finally {
      setPinningThreadId(null);
    }
  };

  const toggleEmailCollapse = (messageId: string) => {
    setCollapsedEmails(prev => ({
      ...prev,
      [messageId]: false
    }));
  };

  const handleDeleteEmail = async (deleteMode: 'soft' | 'Permanent', trackingIdOverride?: string | null) => {
    const currentThread = activeTab === 'inbox'
      ? selectedThread
      : activeTab === 'sent'
        ? selectedSentThread
        : activeTab === 'unassigned'
          ? selectedUnassignedThread
          : selectedAllMessagesThread;
    const trackingIdToDelete = (trackingIdOverride !== undefined ? trackingIdOverride : pendingDeleteThreadId) || currentThread?.trackingId;
    if (!trackingIdToDelete) return;
    const shouldClearCurrentThread = currentThread?.trackingId === trackingIdToDelete;
    
    setShowDeleteDropdown(false);
    setActiveActionThreadId(null);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Inbox/delete-conversation`,
        {
          TrackingIds: [trackingIdToDelete],
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
          if (shouldClearCurrentThread) {
            setSelectedThread(null);
          }
          await fetchMails(false);
        } else if (activeTab === 'sent') {
          if (shouldClearCurrentThread) {
            setSelectedSentThread(null);
          }
          setRefreshSentTab(prev => prev + 1);
        } else if (activeTab === 'unassigned') {
          if (shouldClearCurrentThread) {
            setSelectedUnassignedThread(null);
            setSelectedUnassignedEmail(null);
          }
          setRefreshUnassignedTab(prev => prev + 1);
        } else {
          if (shouldClearCurrentThread) {
            setSelectedAllMessagesThread(null);
          }
          setRefreshAllMessagesTab(prev => prev + 1);
        }
        setPendingDeleteThreadId(null);
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
    } finally {
      setPendingDeleteThreadId(null);
    }
  };

  const requestDelete = (deleteMode: 'soft' | 'Permanent', deleteType: 'single' | 'bulk', trackingId?: string | null) => {
    setDeleteModalType(deleteType);
    setPendingDeleteThreadId(trackingId || null);
    setPendingDeleteMode(deleteMode);
    setShowDeleteDropdown(false);
    setShowBulkDeleteDropdown(false);
    setActiveActionThreadId(null);

    if (deleteMode === 'soft') {
      if (deleteType === 'bulk') {
        handleBulkDelete(deleteMode);
      } else {
        handleDeleteEmail(deleteMode, trackingId);
      }
      return;
    }

    setShowDeleteModal(true);
  };

  const handleKraftEmail = async () => {
    if (!selectedBlueprint || !selectedThread) return;

    if (kraftInFlightRef.current) {
      return;
    }

    kraftInFlightRef.current = true;

    const canKraft = await ensureCanKraft();
    if (!canKraft) {
      kraftInFlightRef.current = false;
      return;
    }

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
        replaceReplyDraftContent(response.data.emailBody);
        playSound();
        window.dispatchEvent(new CustomEvent('creditUpdated', { detail: { clientId: effectiveUserId } }));
      } else {
        setError('Failed to generate email');
      }
    } catch (err: any) {
      console.error('Error krafting email:', err);
      setError(err.response?.data?.message || 'Failed to generate email');
    } finally {
      setIsKrafting(false);
      kraftInFlightRef.current = false;
    }
  };

  const sendReplyEmail = (trackingId: string) => {
    const sendableReplyBody = getSendableReplyBody(replyText);
    const formData = new FormData();
    formData.append('TrackingId', trackingId);
    formData.append('ClientId', String(parseInt(effectiveUserId)));
    formData.append('ReplyBody', sendableReplyBody);
    formData.append('Outboxid', String(selectedInboxId || 0));
    formData.append('CC', replyCc);
    formData.append('BCC', replyBcc);
    formData.append('Provider', selectedProvider);
    replyAttachments.forEach((file) => {
      formData.append('Attachments', file);
    });

    return axios.post(
      `${API_BASE_URL}/api/email/reply_email`,
      formData,
      {
        headers: {
          accept: '*/*',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );
  };

  const renderReplyAttachments = () => (
    <>
      {replyAttachments.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {replyAttachments.map((file, index) => (
            <span
              key={`${file.name}-${file.lastModified}-${index}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '999px',
                fontSize: '12px',
                color: '#374151',
                background: '#f9fafb'
              }}
            >
              {file.name}
              <button
                type="button"
                onClick={() => {
                  setReplyAttachments((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '14px',
                  lineHeight: 1
                }}
                aria-label={`Remove ${file.name}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );

  const getAttachmentUrl = (attachment: InboxAttachment) => {
    const path = attachment.filePath || '';
    if (!path) return '#';
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const formatAttachmentSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentDownload = async (attachment: InboxAttachment) => {
    if (!attachment.id) return;
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/Inbox/download/${attachment.id}`,
        {
          headers: {
            accept: '*/*',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          responseType: 'blob'
        }
      );

      const contentDisposition = response.headers['content-disposition'];
      let filename = attachment.originalFileName || attachment.fileName || 'download';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^'"\s]+)['"]?/i);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      setToastMessage('Failed to download attachment');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const renderMessageAttachments = (attachments?: InboxAttachment[]) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div style={{ margin: '12px 24px 0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {attachments.map((attachment, index) => {
          const fileName = attachment.originalFileName || attachment.fileName || `Attachment ${index + 1}`;
          const fileSize = formatAttachmentSize(attachment.fileSize);

          return (
            <button
              key={`${attachment.id || attachment.filePath || fileName}-${index}`}
              onClick={() => handleAttachmentDownload(attachment)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                maxWidth: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                color: '#1f2937',
                background: '#fff',
                textDecoration: 'none',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              title={fileName}
            >
              <FontAwesomeIcon icon={faPaperclip} style={{ color: '#3f9f42', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fileName}
              </span>
              {fileSize && (
                <span style={{ color: '#6b7280', flexShrink: 0 }}>
                  {fileSize}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    
    setIsSending(true);
    setError('');
    try {
      const response = await sendReplyEmail(selectedThread.trackingId);

      if (response.data.success) {
        // Add the sent message to the thread immediately
        const sentMessage: InboxMessage = {
          type: 'Reply',
          messageId: `temp-${Date.now()}`,
          subject: `Re: ${selectedThread.subject}`,
          body: getSendableReplyBody(replyText),
          fromEmail: inboxList.find(i => i.inboxId === selectedInboxId)?.emailAddress || '',
          toEmail: selectedThread.contactEmail,
          date: new Date().toISOString(),
          isRead: true,
          contactId: selectedThread.contactId
        };
        
        // Update the thread with the new message
        const updatedThread = {
          ...selectedThread,
          messages: [...selectedThread.messages, sentMessage],
          totalMessages: selectedThread.totalMessages + 1,
          lastMessageDate: sentMessage.date
        };
        
        setSelectedThread(updatedThread);
        
        // Update threads list
        setThreads(prevThreads => 
          prevThreads.map(t => 
            t.trackingId === selectedThread.trackingId ? updatedThread : t
          )
        );
        
        setReplyText('');
        setReplyAttachments([]);
        setShowReplySection(false);
        setToastMessage('Reply sent successfully!');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        // Refresh the inbox list in background to get actual data from server
        fetchMails(false);
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
    const containsActualHtml = /<\/?(?:html|head|body|div|table|p|span|font|blockquote|br)\b/i.test(body);
    const containsEncodedHtml = /&lt;\/?(?:html|head|body|div|table|p|span|font|blockquote|br)\b/i.test(body);

    // If the backend already returned real HTML, keep entities like
    // &lt;aamir@mail.com&gt; intact so email addresses don't turn into tags.
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

  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const splitReplyTrail = (html: string): { draftHtml: string; trailHtml: string } => {
    const markerIndex = html.indexOf(replyTrailMarker);

    if (markerIndex === -1) {
      return { draftHtml: html, trailHtml: '' };
    }

    const detailsStart = html.lastIndexOf('<details', markerIndex);
    const divStart = html.lastIndexOf('<div', markerIndex);
    const trailTagStart = Math.max(detailsStart, divStart);

    if (trailTagStart === -1) {
      return { draftHtml: html, trailHtml: '' };
    }

    const separatorStart = Math.max(
      html.lastIndexOf('<br/><br/>', trailTagStart),
      html.lastIndexOf('<br/>', trailTagStart)
    );
    const trailStart = separatorStart === -1 ? trailTagStart : separatorStart;

    return {
      draftHtml: html.slice(0, trailStart),
      trailHtml: html.slice(trailStart),
    };
  };

  const appendReplyTrail = (draftHtml: string, formattedTrail: string): string => {
    const { draftHtml: currentDraftHtml, trailHtml } = splitReplyTrail(draftHtml || '');
    const compactDraftHtml = currentDraftHtml.replace(/(?:<br\s*\/?>|\s)+$/gi, '');

    if (trailHtml) {
      return `${compactDraftHtml}${buildCollapsedReplyTrail(formattedTrail)}`;
    }

    return `${compactDraftHtml}${buildCollapsedReplyTrail(formattedTrail)}`;
  };

  const replyTrailSeparator = '<hr style="border:0;border-top:1px solid #d1d5db;margin:16px 0;width:100%;" />';

  const buildCollapsedReplyTrail = (formattedTrail: string): string => {
    return `<br/><details ${replyTrailMarker} style="margin:0;padding:0;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.35;text-align:left;"><summary contenteditable="false" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;list-style:none;user-select:none;color:#3f9f42;background:#eaf5ea;border:1px solid #cfe7d0;border-radius:999px;font-weight:700;font-size:18px;line-height:1;width:34px;height:22px;padding:0;margin:0 0 10px 0;">...</summary><style>details[data-reply-email-trail][open] > summary{display:none;}</style><div>${replyTrailSeparator}${formattedTrail}</div></details>`;
  };

  const replaceReplyDraftContent = (nextDraftHtml: string) => {
    setReplyText((currentReplyText) => {
      const { trailHtml } = splitReplyTrail(currentReplyText);
      return `${nextDraftHtml || ''}${trailHtml}`;
    });
  };

  const getSendableReplyBody = (html: string): string => {
    if (!html.includes(replyTrailMarker)) {
      return html;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    wrapper.querySelectorAll('details[data-reply-email-trail]').forEach((details) => {
      const trailContent = document.createElement('div');
      trailContent.innerHTML = details.innerHTML;
      trailContent.querySelector('summary')?.remove();
      details.replaceWith(...Array.from(trailContent.childNodes));
    });

    return wrapper.innerHTML;
  };

  const getDraftReplyBody = (html: string): string => {
    const { draftHtml } = splitReplyTrail(html || '');
    return draftHtml;
  };

  const formatReplyTrailHeader = (headerText: string): string => {
    // Recursively decode HTML entities until fully decoded
    const fullyDecode = (text: string): string => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      const decoded = textarea.value;
      // If still contains entities, decode again
      if (decoded !== text && /&(?:quot|lt|gt|amp);/.test(decoded)) {
        return fullyDecode(decoded);
      }
      return decoded;
    };

    const decodedHeader = fullyDecode(headerText);

    const headerRows = decodedHeader
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([^:]+):\s*(.*)$/);

        if (!match) {
          return `<div style="margin:0 0 8px 0;">${escapeHtml(line)}</div>`;
        }

        const fieldName = escapeHtml(match[1]);
        const fieldValue = escapeHtml(match[2]);

        return `<div style="margin:0 0 8px 0;text-align:left;"><strong style="font-weight:700;">${fieldName}:</strong> <span style="font-weight:400;">${fieldValue}</span></div>`;
      })
      .join('');

    return `<div style="margin:0 0 14px 0;padding:0;background:#ffffff;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.35;text-align:left;">${headerRows}</div>`;
  };

  const formatReplyEmailTrail = (trail: string): string => {
    const findFirstHtmlTagIndex = (value: string): number => {
      const htmlTagMatch = value.match(/<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?>/i);
      return htmlTagMatch?.index ?? -1;
    };

    const formatPlainTextAsHtml = (value: string): string =>
      escapeHtml(value).replace(/\r\n|\r|\n/g, '<br>');

    const stripEmailShellLines = (value: string): string => value
      .split(/\r\n|\r|\n/)
      .filter((line) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return true;
        }

        return !/^<!doctype\b/i.test(trimmedLine)
          && !/^<\/?(?:html|head|body)\b[^>]*>$/i.test(trimmedLine)
          && !/^<meta\b[^>]*>$/i.test(trimmedLine)
          && !/^<link\b[^>]*>$/i.test(trimmedLine)
          && !/^<base\b[^>]*>$/i.test(trimmedLine)
          && !/^<style\b[^>]*>[\s\S]*<\/style>$/i.test(trimmedLine)
          && !/^<\/style>$/i.test(trimmedLine);
      })
      .join('\n');

    const stripEmailShellTags = (value: string): string => value
      .replace(/<!doctype[^>]*>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<\/?(?:html|body|head)\b[^>]*>/gi, '')
      .replace(/<(?:meta|style|link|base)\b[^>]*>([\s\S]*?<\/style>)?/gi, '')
      .trim();

    const normalizeTrailBodyContent = (value: string): string => {
      const trimmedValue = stripEmailShellLines(stripEmailShellTags(value)).trim();

      if (!trimmedValue) {
        return '';
      }

      return findFirstHtmlTagIndex(trimmedValue) === -1
        ? formatPlainTextAsHtml(trimmedValue)
        : trimmedValue;
    };

    // Recursively decode HTML entities until fully decoded
    const decodeHtmlEntities = (html: string): string => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = html;
      const decoded = textarea.value;
      // If still contains encoded entities, decode again
      if (decoded !== html && (decoded.includes('&lt;') || decoded.includes('&gt;') || decoded.includes('&quot;') || decoded.includes('&amp;'))) {
        return decodeHtmlEntities(decoded);
      }
      return decoded;
    };

    const decodedTrail = decodeHtmlEntities(trail);
    const htmlStart = decodedTrail.search(/<html[\s>]/i);
    const bodyOpen = decodedTrail.search(/<body[^>]*>/i);
    const bodyClose = decodedTrail.search(/<\/body>/i);
    const firstHtmlTagIndex = findFirstHtmlTagIndex(decodedTrail);
    const htmlBodyWithoutShell = htmlStart > -1
      ? stripEmailShellTags(decodedTrail.slice(htmlStart))
      : '';

    const headerText = htmlStart > 0
      ? decodedTrail.slice(0, htmlStart).trim()
      : firstHtmlTagIndex > 0
        ? decodedTrail.slice(0, firstHtmlTagIndex).trim()
        : bodyOpen > 0
          ? decodedTrail.slice(0, bodyOpen).trim()
          : '';

    const bodyContent = bodyOpen !== -1 && bodyClose !== -1 && bodyClose > bodyOpen
      ? normalizeTrailBodyContent(decodedTrail.slice(decodedTrail.indexOf('>', bodyOpen) + 1, bodyClose))
      : htmlStart > -1
        ? normalizeTrailBodyContent(htmlBodyWithoutShell)
        : firstHtmlTagIndex > -1
          ? normalizeTrailBodyContent(decodedTrail.slice(firstHtmlTagIndex))
          : formatPlainTextAsHtml(decodedTrail);

    const normalizedBodyContent = bodyContent.replace(/<hr\b[^>]*>/gi, replyTrailSeparator);
    const compiledHeader = headerText ? formatReplyTrailHeader(headerText) : '';

    return `${compiledHeader}${normalizedBodyContent}`;
  };

  const copyToClipboardHandler = async () => {
    const container = document.createElement('div');
    container.innerHTML = replyText || '';
    const contentToCopy = (container.textContent || container.innerText || '').trim();

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

  const recipientToggleButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    background: '#fff',
    color: '#2563eb',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  };

  const recipientInputStyle: React.CSSProperties = {
    flex: 1,
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  };

  const recipientIconButtonStyle: React.CSSProperties = {
    width: '38px',
    minWidth: '38px',
    height: '38px',
    padding: 0,
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const collapseReplyCc = () => {
    setReplyCc('');
    setShowReplyCc(false);
  };

  const collapseReplyBcc = () => {
    setReplyBcc('');
    setShowReplyBcc(false);
  };

  const collapseForwardBcc = () => {
    setForwardBccEmail('');
    setShowForwardBcc(false);
  };

  const renderReplyRecipientToggles = () => (
    <>
      {!showReplyCc && (
        <button
          type="button"
          onClick={() => setShowReplyCc(true)}
          style={recipientToggleButtonStyle}
        >
          CC
        </button>
      )}
      {!showReplyBcc && (
        <button
          type="button"
          onClick={() => setShowReplyBcc(true)}
          style={recipientToggleButtonStyle}
        >
          BCC
        </button>
      )}
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '9px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          color: '#374151',
          background: '#fff',
          gap: '6px',
          whiteSpace: 'nowrap'
        }}
      >
        <FontAwesomeIcon icon={faPaperclip} style={{ color: '#3f9f42' }} />
        <input
          type="file"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setReplyAttachments((prev) => [...prev, ...files]);
            e.target.value = '';
          }}
          style={{ display: 'none' }}
        />
      </label>
    </>
  );

  const renderReplyRecipientFields = () => (
    <>
      {showReplyCc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={replyCc}
            onChange={(e) => setReplyCc(e.target.value)}
            placeholder="CC"
            style={recipientInputStyle}
          />
          <button
            type="button"
            onClick={collapseReplyCc}
            title="Hide CC"
            aria-label="Hide CC"
            style={recipientIconButtonStyle}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
      {showReplyBcc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={replyBcc}
            onChange={(e) => setReplyBcc(e.target.value)}
            placeholder="BCC"
            style={recipientInputStyle}
          />
          <button
            type="button"
            onClick={collapseReplyBcc}
            title="Hide BCC"
            aria-label="Hide BCC"
            style={recipientIconButtonStyle}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </>
  );

  const openForwardModal = (thread: InboxThread) => {
    setForwardTrackingId(thread.trackingId);
    setForwardEmail('');
    setForwardBccEmail('');
    setForwardMessage('');
    setShowForwardBcc(false);
    setShowReplySection(false);
    setShowForwardSection(true);
  };

  const closeForwardModal = () => {
    if (isForwarding) return;
    setForwardEmail('');
    setForwardBccEmail('');
    setForwardMessage('');
    setForwardTrackingId('');
    setShowForwardBcc(false);
    setShowForwardSection(false);
  };

  const handleForwardEmail = async () => {
    if (!forwardTrackingId || !forwardEmail.trim() || !forwardMessage.trim()) return;

    setIsForwarding(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/Forward/forward-email`,
        {
          trackingId: forwardTrackingId,
          clientId: parseInt(effectiveUserId),
          forwardToEmail: forwardEmail.trim(),
          forwardMessage,
          outboxId: selectedInboxId || 0,
          bccEmail: forwardBccEmail.trim(),
          Provider: selectedProvider
        },
        {
          headers: {
            accept: '*/*',
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to forward email');
      }

      setToastMessage('Email forwarded successfully!');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setForwardEmail('');
      setForwardBccEmail('');
      setForwardMessage('');
      setForwardTrackingId('');
      setShowForwardBcc(false);
      setShowForwardSection(false);
    } catch (err: any) {
      console.error('Error forwarding email:', err);
      setToastMessage(err.response?.data?.message || err.message || 'Failed to forward email');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsForwarding(false);
    }
  };

  const renderForwardSection = () => (
    <form
      className="reply-section"
      onSubmit={(e) => {
        e.preventDefault();
        handleForwardEmail();
      }}
      style={{
        marginTop: '24px',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '24px',
        padding: '24px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <label style={{ fontWeight: '500', fontSize: '14px', color: '#374151' }}>Forward</label>
      </div>

      <style>
        {`
          .reply-section .rich-text-editor > div {
            min-height: 160px !important;
            height: auto !important;
            overflow-y: visible !important;
          }
        `}
      </style>

      <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="email"
            value={forwardEmail}
            onChange={(e) => setForwardEmail(e.target.value)}
            placeholder="To"
            required
            style={{
              flex: 1,
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          {!showForwardBcc && (
            <button
              type="button"
              onClick={() => setShowForwardBcc(true)}
              style={{
                padding: '10px 12px',
                background: '#fff',
                color: '#2563eb',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
            >
              BCC
            </button>
          )}
        </div>
        {showForwardBcc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="email"
              value={forwardBccEmail}
              onChange={(e) => setForwardBccEmail(e.target.value)}
              placeholder="BCC"
              style={recipientInputStyle}
            />
            <button
              type="button"
              onClick={collapseForwardBcc}
              title="Hide BCC"
              aria-label="Hide BCC"
              style={recipientIconButtonStyle}
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
        <RichTextEditor value={forwardMessage} onChange={setForwardMessage} />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="submit"
          disabled={isForwarding || !forwardEmail.trim() || !forwardMessage.trim()}
          style={{
            padding: '10px 24px',
            ...(isForwarding || !forwardEmail.trim() || !forwardMessage.trim()
              ? { background: '#e5e7eb', color: '#9ca3af', border: '1px solid #d1d5db' }
              : primarySoftButtonStyle),
            borderRadius: '6px',
            cursor: isForwarding || !forwardEmail.trim() || !forwardMessage.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isForwarding ? 'Forwarding...' : 'Forward'}
        </button>
        <button
          type="button"
          onClick={closeForwardModal}
          disabled={isForwarding}
          style={{
            padding: '10px 24px',
            ...secondaryButtonStyle,
            borderRadius: '6px',
            cursor: isForwarding ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );

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
          emailBody: getDraftReplyBody(replyText)
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
      // Call the refresh API
      const response = await axios.post(
        `${API_BASE_URL}/api/Inbox/RefreshInbox?inboxId=${selectedInboxId}&clientId=${effectiveUserId}&provider=${selectedProvider}`,
        {},
        {
          headers: {
            'accept': '*/*',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      setToastMessage(response.data.message || 'Inbox refreshed successfully');
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      // Clear selected threads
      setSelectedThread(null);
      setSelectedSentThread(null);
      setSelectedUnassignedThread(null);
      
      // Trigger refresh for all tabs
      if (activeTab === 'inbox') {
        await fetchMails(false);
      } else if (activeTab === 'sent') {
        setRefreshSentTab(prev => prev + 1);
      } else if (activeTab === 'unassigned') {
        setRefreshUnassignedTab(prev => prev + 1);
      } else if (activeTab === 'all' || activeTab === 'allmessages') {
        setRefreshAllMessagesTab(prev => prev + 1);
      }
      
      // Refresh unread counts
      await refreshInboxDropdownCounts();
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

  const getActiveThread = (): InboxThread | null => {
    if (activeTab === 'inbox') return selectedThread;
    if (activeTab === 'sent') return selectedSentThread;
    if (activeTab === 'unassigned') return selectedUnassignedThread;
    return selectedAllMessagesThread;
  };

  const getActiveContactId = (): number | null => {
    if (activeTab === 'inbox') return selectedThread?.contactId ?? null;
    if (activeTab === 'sent') return selectedSentThread?.contactId ?? null;
    if (activeTab === 'unassigned') return selectedUnassignedThread?.contactId ?? null;
    return selectedAllMessagesThread?.contactId ?? null;
  };

  const hasActiveThread = !!(selectedThread || selectedSentThread || selectedUnassignedThread || selectedAllMessagesThread);

  if (!isVisible) {
    return null;
  }

  // 1) New user with no inbox configured — prompt to add one in Configuration.
  if (isVisible && !loading && inboxList.length === 0) {
    return (
      <div className="inbox-workspace dashboard-section" style={{ display: isVisible ? 'block' : 'none', position: 'relative' }}>
        <ToastMessage
          show={showToast}
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
          position="bottom-center"
          duration={3}
        />
        <InboxEmptyState onGoToConfiguration={goToInboxConfiguration} />
      </div>
    );
  }

  // 2) User has inboxes but hasn't picked one yet — show the select banner.
  if (isVisible && inboxList.length > 0 && !selectedInboxId) {
    return (
      <div className="inbox-workspace dashboard-section" style={{ display: isVisible ? 'block' : 'none', position: 'relative' }}>
        <ToastMessage
          show={showToast}
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
          position="bottom-center"
          duration={3}
        />
        <InboxSelectState
          inboxList={inboxList}
          selectedInboxId={selectedInboxId}
          onInboxChange={handleInboxChange}
        />
      </div>
    );
  }

  // 3) Inbox selected — show the full inbox workspace (existing page).
  return (
    <div className="inbox-workspace dashboard-section" style={{ display: isVisible ? 'block' : 'none', position: 'relative' }}>
      <ToastMessage
        show={showToast}
        message={toastMessage}
        type={toastType}
        onClose={() => setShowToast(false)}
        position="bottom-center"
        duration={3}
      />
      {loading && inboxList.length === 0 && <LoadingSpinner message="Loading..." />}

      {/* Email Content */}
      <div
        className="inbox-content inbox-grid"
        style={{
          opacity: loading ? 0.5 : 1,
          gridTemplateColumns: `${hasActiveThread ? '340px' : '372px'} 1fr ${contactPanelOpen && hasActiveThread ? '332px' : '0px'}`
        }}
      >
          {/* LIST PANE */}
          <div className="list-pane">
            {/* Inbox Selection */}
            <div className="list-pane-header">
                <select
                  value={selectedInboxId || ''}
                  onChange={handleInboxChange}
                  disabled={inboxList.length === 0}
                >
                  <option value="">Choose an inbox</option>
                  {inboxList.map((inbox) => (
                    <option key={inbox.inboxId} value={inbox.inboxId}>
                      {inbox.emailAddress || `Inbox ${inbox.inboxId}`}
                      {inbox.totalUnreadCount ? ` (${inbox.totalUnreadCount})` : ''}
                    </option>
                  ))}
                </select>
                
                <button
                  className="refresh-btn"
                  onClick={handleRefreshInbox}
                  disabled={isRefreshing}
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
            </div>

            {/* Inbox Tabs */}
            <div className="inbox-tabs">
              <button
                className={`inbox-tab${activeTab === 'allmessages' || activeTab === 'all' ? ' active' : ''}`}
                onClick={() => handleTabChange('allmessages')}
              >
                All messages
              </button>
              <button
                className={`inbox-tab${activeTab === 'inbox' ? ' active' : ''}`}
                onClick={() => handleTabChange('inbox')}
              >
                Associated{unreadCounts.inboxReplies > 0 ? <span className="tab-badge">{unreadCounts.inboxReplies}</span> : null}
              </button>
              <button
                className={`inbox-tab${activeTab === 'unassigned' ? ' active' : ''}`}
                onClick={() => handleTabChange('unassigned')}
              >
                External{unreadCounts.unassigned > 0 ? <span className="tab-badge">{unreadCounts.unassigned}</span> : null}
              </button>
              <button
                className={`inbox-tab${activeTab === 'sent' ? ' active' : ''}`}
                onClick={() => handleTabChange('sent')}
              >
                Sent
              </button>
            </div>
            
            {/* Mail list items */}
            <div className="list-scroll">
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
                            title={`Remove ${selectedThreadIds.length} email(s) from inbox`}
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
                                  requestDelete('soft', 'bulk');
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
                                  setDeleteModalType('bulk');
                                  setPendingDeleteThreadId(null);
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
                        Page {inboxCurrentPage} of {inboxTotalPages} | {inboxTotalCount} {inboxTotalCount === 1 ? 'email' : 'emails'}
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
                          background: inboxCurrentPage === 1 ? '#f3f4f6' : '#e2f1e3',
                          cursor: inboxCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '18px',
                          color: inboxCurrentPage === 1 ? '#9ca3af' : '#3f9f42'
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
                          background: inboxCurrentPage === inboxTotalPages ? '#f3f4f6' : '#e2f1e3',
                          cursor: inboxCurrentPage === inboxTotalPages ? 'not-allowed' : 'pointer',
                          fontSize: '18px',
                          color: inboxCurrentPage === inboxTotalPages ? '#9ca3af' : '#3f9f42'
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
                                        requestDelete('soft', 'single', thread.trackingId);
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
                                .replace(/\bRead more:\s*/gi, '')
                                .replace(/\bLIKE\s+\d+\b/gi, '')
                                .replace(/https?:\/\/\S+/gi, '')
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
                isActive={activeTab === 'sent'}
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
                onSetReplyText={(text) => setReplyText(text)}
              />
            ) : activeTab === 'unassigned' ? (
              <UnassignedTab 
                effectiveUserId={effectiveUserId} 
                token={token} 
                selectedInboxId={selectedInboxId}
                selectedProvider={selectedProvider}
                isActive={activeTab === 'unassigned'}
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
                onUnreadCountsRefresh={refreshInboxDropdownCounts}
                refreshTrigger={refreshUnassignedTab}
                onSetReplyText={(text) => setReplyText(text)}
              />
            ) : null}
            {/* AllMessagesTab — always mounted inside list-scroll to prevent refetch */}
            <div style={{ display: activeTab === 'all' || activeTab === 'allmessages' ? 'block' : 'none' }}>
              <AllMessagesTab
                effectiveUserId={effectiveUserId}
                token={token}
                selectedInboxId={selectedInboxId}
                selectedProvider={selectedProvider}
                isActive={activeTab === 'all' || activeTab === 'allmessages'}
                selectedThread={selectedAllMessagesThread}
                onThreadSelect={(thread) => {
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
                onUnreadCountsRefresh={refreshInboxDropdownCounts}
                refreshTrigger={refreshAllMessagesTab}
                onSetReplyText={(text) => setReplyText(text)}
              />
            </div>
            </div>
          </div>
          
          {/* READING PANE */}
          <div className="read-pane">
            {/* Unified header: shown whenever a thread is active */}
            {hasActiveThread && (
              <div className="read-head">
                <h1 className="read-subject">{getActiveThread()!.subject}</h1>
                <div className="read-head-actions">
                  <div style={{ position: 'relative' }}>
                    <button
                      className="head-icon danger"
                      title="Delete"
                      onClick={() => setShowDeleteDropdown(!showDeleteDropdown)}
                    >
                      <FontAwesomeIcon icon={faTrashAlt} style={{ width: 16, height: 16 }} />
                    </button>
                    {showDeleteDropdown && (
                      <div className="delete-dropdown">
                        <button onClick={() => requestDelete('soft', 'single', null)}>Remove from Inbox</button>
                        <button onClick={() => { setDeleteModalType('single'); setPendingDeleteThreadId(null); setPendingDeleteMode('Permanent'); setShowDeleteModal(true); setShowDeleteDropdown(false); }}>Delete permanently</button>
                      </div>
                    )}
                  </div>
                  <button
                    className={`head-icon${contactPanelOpen ? ' panel-active' : ''}`}
                    title="Toggle contact panel"
                    onClick={() => setContactPanelOpen(!contactPanelOpen)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="17" height="17"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>
                  </button>
                </div>
              </div>
            )}
            {!hasActiveThread && (
              <div className="read-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p>Select an email to read it here</p>
              </div>
            )}
            {hasActiveThread && (
              <button
                type="button"
                className="scroll-to-bottom-btn"
                title="Scroll to bottom"
                onClick={() => {
                  const el = mailDetailRef.current;
                  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </button>
            )}
          {/* Tab-specific content */}
          {activeTab === 'inbox' ? (
            selectedThread ? (
            <div className="mail-detail" ref={mailDetailRef}>
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
                          requestDelete('soft', 'single', null);
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
                          setDeleteModalType('single');
                          setPendingDeleteThreadId(null);
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
              </div>
              
              {/* Sort messages by date - latest first, oldest last */}
              {[...selectedThread.messages].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              ).map((message, index, sortedMessages) => {
                const messageContactId = message.type === 'Reply' ? message.contactId : null;
                const uniqueKey = `${message.messageId}-${index}`;
                console.log('Message type:', message.type, 'contactId:', messageContactId);
                return (
                <div key={uniqueKey} style={{ paddingBottom: index < sortedMessages.length - 1 ? '16px' : '0', borderBottom: index < sortedMessages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          title="Forward"
                          aria-label="Forward email"
                          onClick={(e) => {
                            e.stopPropagation();
                            openForwardModal(selectedThread);
                          }}
                          style={{
                            width: '34px',
                            height: '34px',
                            padding: 0,
                            ...primarySoftButtonStyle,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <FontAwesomeIcon icon={faShare} />
                        </button>
                        <div className="mail-detail-date">{new Date(message.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                      </div>
                    </div>
                  </div>
                  {(collapsedEmails[uniqueKey] ?? index !== 0) ? (
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
                    <div>
                      <div className="mail-body" style={{ maxWidth: '100%', padding: 0 }}>
                        <EmailIframe
                          html={formatEmailBody(message.body)}
                        />
                      </div>
                    </div>
                  )}
                  {renderMessageAttachments(message.attachments)}
                </div>
              );})}
              {showForwardSection && renderForwardSection()}

              {/* Reply Button */}
              {!showReplySection && !showForwardSection && (
                <div className="reply-button-sticky">
                  <button
                    type="button"
                    className="reply-pill-button"
                    onClick={async () => {
                      const signature = await fetchDefaultSignature();
                      setReplyText(signature);
                      setShowReplySection(true);
                    }}
                  >
                    <FontAwesomeIcon icon={faReply} className="reply-pill-icon" />
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
                  <label style={{ fontWeight: '500', fontSize: '14px', color: '#374151' }}>Write reply</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {renderReplyRecipientToggles()}
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
                        background: (!selectedBlueprint || isKrafting) ? '#ccc' : '#e2f1e3',
                        color: '#3f9f42',
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
                {renderReplyRecipientFields()}
                <style>
                  {`
                    .reply-section .rich-text-editor > div {
                      min-height: 160px !important;
                      height: auto !important;
                      overflow-y: visible !important;
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
                      type="button"
                      className="button square-40 justify-center"
                      title={isSavingDraft ? 'Saving draft' : 'Save draft'}
                      aria-label={isSavingDraft ? 'Saving draft' : 'Save draft'}
                      style={{ 
                        ...(isSavingDraft || !replyText.trim()
                          ? { background: '#e5e7eb', color: '#9ca3af', border: '1px solid #d1d5db' }
                          : primarySoftButtonStyle),
                        fontWeight: '500',
                        fontSize: '16px',
                        padding: 0,
                        width: '40px',
                        minWidth: '40px',
                        cursor: isSavingDraft || !replyText.trim() ? 'not-allowed' : 'pointer'
                      }}
                      onClick={handleSaveDraft}
                      disabled={isSavingDraft || !replyText.trim()}
                    >
                      <FontAwesomeIcon icon={faFloppyDisk} />
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
                    <label style={{ fontWeight: '500', fontSize: '16px', marginBottom: '12px', display: 'block' }}>Reply editor</label>
                    <RichTextEditor value={replyText} onChange={setReplyText} />
                  </div>
                </Modal>
                {renderReplyAttachments()}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isSending}
                    style={{
                      padding: '10px 24px',
                      ...((!replyText.trim() || isSending)
                        ? { background: '#e5e7eb', color: '#9ca3af', border: '1px solid #d1d5db' }
                        : primarySoftButtonStyle),
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
                      setReplyAttachments([]);
                      setReplyCc('');
                      setReplyBcc('');
                      setShowReplyCc(false);
                      setShowReplyBcc(false);
                    }}
                    style={{
                      padding: '10px 24px',
                      ...secondaryButtonStyle,
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
              <div className="mail-detail" ref={mailDetailRef}>
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
                            requestDelete('soft', 'single', null);
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
                            setDeleteModalType('single');
                            setPendingDeleteThreadId(null);
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
                </div>

                {/* Sort messages by date - latest first, oldest last */}
                {[...selectedSentThread.messages].sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                ).map((message, index, sortedMessages) => {
                  const uniqueKey = `sent-${message.messageId}-${index}`;
                  return (
                  <div key={uniqueKey} style={{ paddingBottom: index < sortedMessages.length - 1 ? '16px' : '0', borderBottom: index < sortedMessages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
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
                    {(collapsedEmails[uniqueKey] ?? index !== 0) ? (
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
                      <div>
                        <div className="mail-body" style={{ maxWidth: '100%', padding: 0 }}>
                        <EmailIframe
                          html={formatEmailBody(message.body)}
                        />
                      </div>
                      </div>
                    )}
                    {renderMessageAttachments(message.attachments)}
                  </div>
                );})}
              </div>
            ) : selectedUnassignedThread ? (
              <div className="mail-detail" ref={mailDetailRef}>
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
                            requestDelete('soft', 'single', null);
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
                            setDeleteModalType('single');
                            setPendingDeleteThreadId(null);
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
                </div>

                {/* Sort messages by date - latest first, oldest last */}
                {[...selectedUnassignedThread.messages].sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                ).map((message, index, sortedMessages) => {
                  const uniqueKey = `unassigned-${message.messageId}-${index}`;
                  return (
                  <div key={uniqueKey} style={{ paddingBottom: index < sortedMessages.length - 1 ? '16px' : '0', borderBottom: index < sortedMessages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            title="Forward"
                            aria-label="Forward email"
                            onClick={(e) => {
                              e.stopPropagation();
                              openForwardModal(selectedUnassignedThread);
                            }}
                            style={{
                              width: '34px',
                              height: '34px',
                              padding: 0,
                              ...primarySoftButtonStyle,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FontAwesomeIcon icon={faShare} />
                          </button>
                          <div className="mail-detail-date">{new Date(message.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                        </div>
                      </div>
                    </div>
                    {(collapsedEmails[uniqueKey] ?? index !== 0) ? (
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
                      <div>
                        <div className="mail-body" style={{ maxWidth: '100%', padding: 0 }}>
                        <EmailIframe
                          html={formatEmailBody(message.body)}
                        />
                      </div>
                      </div>
                    )}
                    {renderMessageAttachments(message.attachments)}
                  </div>
                );})}
                {showForwardSection && renderForwardSection()}

                {/* Reply Button */}
                {!showReplySection && !showForwardSection && (
                  <div className="reply-button-sticky">
                    <button
                      type="button"
                      className="reply-pill-button"
                      onClick={async () => {
                        const signature = await fetchDefaultSignature();
                        setReplyText(signature);
                        setShowReplySection(true);
                      }}
                    >
                      <FontAwesomeIcon icon={faReply} className="reply-pill-icon" />
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
                    <label style={{ fontWeight: '500', fontSize: '14px', color: '#374151' }}>Write reply</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {renderReplyRecipientToggles()}
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

                          if (!isDemoAccount) {
                            const currentCredits = await checkUserCredits(effectiveUserId);
                            if (currentCredits && typeof currentCredits === 'object' && !currentCredits.canGenerate) {
                              return;
                            }
                          }

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
                              replaceReplyDraftContent(response.data.emailBody);
                              playSound();
                              window.dispatchEvent(new CustomEvent('creditUpdated', { detail: { clientId: effectiveUserId } }));
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
                          background: (!selectedBlueprint || isKrafting || !selectedUnassignedThread.contactId) ? '#ccc' : '#e2f1e3',
                          color: '#3f9f42',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (!selectedBlueprint || isKrafting || !selectedUnassignedThread.contactId) ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isKrafting ? 'Krafting...' : 'Kraft'}
                      </button>
                    </div>
                  </div>
                  {renderReplyRecipientFields()}
                  <style>
                    {`
                      .reply-section .rich-text-editor > div {
                        min-height: 160px !important;
                        height: auto !important;
                        overflow-y: visible !important;
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
                        type="button"
                        className="button square-40 justify-center"
                        title={isSavingDraft ? 'Saving draft' : 'Save draft'}
                        aria-label={isSavingDraft ? 'Saving draft' : 'Save draft'}
                        style={{ 
                          ...(isSavingDraft || !replyText.trim() || !selectedUnassignedThread.contactId
                            ? { background: '#e5e7eb', color: '#9ca3af', border: '1px solid #d1d5db' }
                            : primarySoftButtonStyle),
                          fontWeight: '500',
                          fontSize: '16px',
                          padding: 0,
                          width: '40px',
                          minWidth: '40px',
                          cursor: isSavingDraft || !replyText.trim() || !selectedUnassignedThread.contactId ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft || !replyText.trim() || !selectedUnassignedThread.contactId}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
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
                      <label style={{ fontWeight: '500', fontSize: '16px', marginBottom: '12px', display: 'block' }}>Reply editor</label>
                      <RichTextEditor value={replyText} onChange={setReplyText} />
                    </div>
                  </Modal>
                  {renderReplyAttachments()}
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
                          const response = await sendReplyEmail(emailTrackingId);

                          if (response.data.success) {
                            // Add the sent message to the thread immediately
                            const sentMessage: InboxMessage = {
                              type: 'Reply',
                              messageId: `temp-${Date.now()}`,
                              subject: `Re: ${selectedUnassignedThread.subject}`,
                              body: getSendableReplyBody(replyText),
                              fromEmail: inboxList.find(i => i.inboxId === selectedInboxId)?.emailAddress || '',
                              toEmail: selectedUnassignedThread.contactEmail,
                              date: new Date().toISOString(),
                              isRead: true,
                              contactId: selectedUnassignedThread.contactId
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
                            setReplyAttachments([]);
                            setShowReplySection(false);
                            setToastMessage('Reply sent successfully!');
                            setToastType('success');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                            
                            // Refresh in background
                            setRefreshUnassignedTab(prev => prev + 1);
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
                        ...((!replyText.trim() || isSending)
                          ? { background: '#e5e7eb', color: '#9ca3af', border: '1px solid #d1d5db' }
                          : primarySoftButtonStyle),
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
                        setReplyAttachments([]);
                        setReplyCc('');
                        setReplyBcc('');
                        setShowReplyCc(false);
                        setShowReplyBcc(false);
                      }}
                      style={{
                        padding: '10px 24px',
                        ...secondaryButtonStyle,
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
              <div className="mail-detail" ref={mailDetailRef}>
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
                            requestDelete('soft', 'single', null);
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
                            setDeleteModalType('single');
                            setPendingDeleteThreadId(null);
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
                </div>

                {/* Sort messages by date - latest first, oldest last */}
                {[...selectedAllMessagesThread.messages].sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                ).map((message, index, sortedMessages) => {
                  const uniqueKey = `all-${message.messageId}-${index}`;
                  return (
                  <div key={uniqueKey} style={{ paddingBottom: index < sortedMessages.length - 1 ? '16px' : '0', borderBottom: index < sortedMessages.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
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
                              {extractEmailAddress(message.toEmail || selectedAllMessagesThread.contactEmail)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMessageExpand(uniqueKey);
                              }}
                              aria-label={expandedMessages[uniqueKey] ? 'Hide email details' : 'Show email details'}
                              aria-expanded={Boolean(expandedMessages[uniqueKey])}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                color: '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '4px'
                              }}
                            >
                              <FontAwesomeIcon
                                icon={faCaretDown}
                                style={{
                                  transform: expandedMessages[uniqueKey] ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s',
                                  fontSize: '11px'
                                }}
                              />
                            </button>
                          </div>
                          {expandedMessages[uniqueKey] && (
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
                                <strong style={{ color: '#374151' }}>To:</strong> {extractEmailAddress(message.toEmail || selectedAllMessagesThread.contactEmail)}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            title="Forward"
                            aria-label="Forward email"
                            onClick={(e) => {
                              e.stopPropagation();
                              openForwardModal(selectedAllMessagesThread);
                            }}
                            style={{
                              width: '34px',
                              height: '34px',
                              padding: 0,
                              ...primarySoftButtonStyle,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FontAwesomeIcon icon={faShare} />
                          </button>
                          <div className="mail-detail-date">{new Date(message.date).toLocaleString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                        </div>
                      </div>
                    </div>
                    {(collapsedEmails[uniqueKey] ?? index !== 0) ? (
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
                      <div>
                        <div className="mail-body" style={{ maxWidth: '100%', padding: 0 }}>
                        <EmailIframe
                          html={formatEmailBody(message.body)}
                        />
                      </div>
                      </div>
                    )}
                    {renderMessageAttachments(message.attachments)}
                  </div>
                );})}
                {showForwardSection && renderForwardSection()}

                {/* Reply Button */}
                {!showReplySection && !showForwardSection && (
                  <div className="reply-button-sticky">
                    <button
                      type="button"
                      className="reply-pill-button"
                      onClick={async () => {
                        const signature = await fetchDefaultSignature();
                        setReplyText(signature);
                        setShowReplySection(true);
                      }}
                    >
                      <FontAwesomeIcon icon={faReply} className="reply-pill-icon" />
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
                    <label style={{ fontWeight: '500', fontSize: '14px', color: '#374151' }}>Write reply</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {renderReplyRecipientToggles()}
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

                          if (kraftInFlightRef.current) {
                            return;
                          }

                          kraftInFlightRef.current = true;

                          const canKraft = await ensureCanKraft();
                          if (!canKraft) {
                            kraftInFlightRef.current = false;
                            return;
                          }

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
                              replaceReplyDraftContent(response.data.emailBody);
                              playSound();
                              window.dispatchEvent(new CustomEvent('creditUpdated', { detail: { clientId: effectiveUserId } }));
                            } else {
                              setError('Failed to generate email');
                            }
                          } catch (err: any) {
                            console.error('Error krafting email:', err);
                            setError(err.response?.data?.message || 'Failed to generate email');
                          } finally {
                            setIsKrafting(false);
                            kraftInFlightRef.current = false;
                          }
                        }}
                        disabled={!selectedBlueprint || isKrafting || !selectedAllMessagesThread.contactId}
                        style={{
                          padding: '6px 16px',
                          background: (!selectedBlueprint || isKrafting || !selectedAllMessagesThread.contactId) ? '#ccc' : '#e2f1e3',
                          color: '#3f9f42',
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
                  {renderReplyRecipientFields()}
                  <style>
                    {`
                      .reply-section .rich-text-editor > div {
                        min-height: 160px !important;
                        height: auto !important;
                        overflow-y: visible !important;
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
                        type="button"
                        className="button square-40 justify-center"
                        title={isSavingDraft ? 'Saving draft' : 'Save draft'}
                        aria-label={isSavingDraft ? 'Saving draft' : 'Save draft'}
                        style={{
                          ...(isSavingDraft || !replyText.trim() || !selectedAllMessagesThread.contactId
                            ? { background: '#e5e7eb', color: '#9ca3af', border: '1px solid #d1d5db' }
                            : primarySoftButtonStyle),
                          fontWeight: '500',
                          fontSize: '16px',
                          padding: 0,
                          width: '40px',
                          minWidth: '40px',
                          cursor: isSavingDraft || !replyText.trim() || !selectedAllMessagesThread.contactId ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleSaveDraft}
                        disabled={isSavingDraft || !replyText.trim() || !selectedAllMessagesThread.contactId}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
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
                      <label style={{ fontWeight: '500', fontSize: '16px', marginBottom: '12px', display: 'block' }}>Reply editor</label>
                      <RichTextEditor value={replyText} onChange={setReplyText} />
                    </div>
                  </Modal>
                  {renderReplyAttachments()}
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
                          const response = await sendReplyEmail(emailTrackingId);

                          if (response.data.success) {
                            const sentMessage: InboxMessage = {
                              type: 'Reply',
                              messageId: `temp-${Date.now()}`,
                              subject: `Re: ${selectedAllMessagesThread.subject}`,
                              body: getSendableReplyBody(replyText),
                              fromEmail: inboxList.find(i => i.inboxId === selectedInboxId)?.emailAddress || '',
                              toEmail: selectedAllMessagesThread.contactEmail,
                              date: new Date().toISOString(),
                              isRead: true,
                              contactId: selectedAllMessagesThread.contactId
                            };

                            const updatedThread = {
                              ...selectedAllMessagesThread,
                              messages: [...selectedAllMessagesThread.messages, sentMessage],
                              totalMessages: selectedAllMessagesThread.totalMessages + 1,
                              lastMessageDate: sentMessage.date
                            };

                            setSelectedAllMessagesThread(updatedThread);
                            setReplyText('');
                            setReplyAttachments([]);
                            setShowReplySection(false);
                            setToastMessage('Reply sent successfully!');
                            setToastType('success');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                            
                            // Refresh in background
                            setRefreshAllMessagesTab(prev => prev + 1);
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
                        ...((!replyText.trim() || isSending)
                          ? { background: '#e5e7eb', color: '#9ca3af', border: '1px solid #d1d5db' }
                          : primarySoftButtonStyle),
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
                        setReplyAttachments([]);
                        setReplyCc('');
                        setReplyBcc('');
                        setShowReplyCc(false);
                        setShowReplyBcc(false);
                      }}
                      style={{
                        padding: '10px 24px',
                        ...secondaryButtonStyle,
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
          
          </div>{/* /read-pane */}

          {/* CONTACT PANEL */}
          <div className="contact-pane">
            {contactPanelOpen && hasActiveThread && (
              <div className="contact-inner">
                <button
                  className="contact-collapse-btn"
                  title="Collapse panel"
                  onClick={() => setContactPanelOpen(false)}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
                </button>
                <ContactInfoPanel
                  contactId={getActiveContactId()}
                  token={token}
                />
              </div>
            )}
          </div>
        </div>

        {/* Floating contact reopen tab */}
        {hasActiveThread && !contactPanelOpen && (
          <button className="panel-reopen" onClick={() => setContactPanelOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
            Contact
          </button>
        )}

      <CreditCheckModal
        isOpen={showCreditModal || forceShowCreditModal}
        onClose={() => {
          setForceShowCreditModal(false);
          closeCreditModal();
        }}
        onSkip={() => {
          setForceShowCreditModal(false);
          handleSkipModal();
        }}
        credits={credits}
        setTab={() => { window.location.hash = '/main?tab=MyPlan'; }}
      />
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        deleteMode={pendingDeleteMode}
        count={deleteModalType === 'bulk' ? selectedThreadIds.length : 1}
        onClose={() => {
          setShowDeleteModal(false);
          setShowDeleteDropdown(false);
          setShowBulkDeleteDropdown(false);
          setActiveActionThreadId(null);
          setPendingDeleteThreadId(null);
        }}
        onConfirm={() => {
          setShowDeleteModal(false);
          setShowDeleteDropdown(false);
          setShowBulkDeleteDropdown(false);
          setActiveActionThreadId(null);
          if (deleteModalType === 'bulk') {
            handleBulkDelete(pendingDeleteMode);
          } else {
            handleDeleteEmail(pendingDeleteMode);
          }
        }}
      />
    </div>
  );
};

export default InboxView;
