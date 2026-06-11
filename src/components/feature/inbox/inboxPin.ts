import axios from 'axios';
import API_BASE_URL from '../../../config';

export interface PinnableThread {
  trackingId: string;
  isPinned?: boolean;
  isPin?: boolean;
}

export const isThreadPinned = (thread: PinnableThread): boolean => Boolean(thread.isPinned ?? thread.isPin);

export const pinEmail = (
  clientId: string,
  trackingId: string,
  token: string | null
) => axios.post(
  `${API_BASE_URL}/api/Inbox/pin_email?ClientId=${encodeURIComponent(clientId)}&TrackingId=${encodeURIComponent(trackingId)}`,
  '',
  {
    headers: {
      accept: '*/*',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  }
);
