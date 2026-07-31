import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import { Mail, RotateCcw } from 'lucide-react';
import {
  bannerClass,
  cardClass,
  hintClass,
  sectionClass,
  sectionTitleClass,
} from '../common/settingsStyles';

interface TrackingProps {
  selectedClient?: string;
}

type Banner = { type: 'success' | 'error'; text: string } | null;

const badgeClass = (state: 'enabled' | 'disabled' | 'busy') => {
  const base =
    'rounded-full border px-2.5 py-0.5 text-[13px] font-semibold';
  if (state === 'enabled')
    return `${base} border-[#e2f1e3] bg-[#f1f8f2] text-[#2d7a30]`;
  if (state === 'busy')
    return `${base} border-[#e8eaee] bg-[#f4f5f7] text-[#6b7280]`;
  return `${base} border-[#e8eaee] bg-[#f4f5f7] text-[#6b7280]`;
};

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  busy: boolean;
  disabled: boolean;
  statusText: string;
  onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  title,
  description,
  checked,
  busy,
  disabled,
  statusText,
  onToggle,
}) => (
  <div className="flex items-start justify-between gap-6">
    <div className="flex min-w-0 items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e2f1e3] bg-[#f1f8f2] text-[#3f9f42]">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#0b1220]">{title}</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-[#6b7280]">
          {description}
        </p>
      </div>
    </div>

    <div className="flex shrink-0 items-center gap-3.5">
      <span className={badgeClass(busy ? 'busy' : checked ? 'enabled' : 'disabled')}>
        {statusText}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle ${title.toLowerCase()}`}
        onClick={onToggle}
        disabled={disabled}
        className={`relative h-6 w-11 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          checked
            ? 'border-[#3f9f42] bg-[#3f9f42]'
            : 'border-[#d1d5db] bg-[#e5e7eb]'
        }`}
      >
        <span
          className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-all ${
            checked ? 'left-[22px]' : 'left-[3px]'
          }`}
        />
      </button>
    </div>
  </div>
);

const Tracking: React.FC<TrackingProps> = ({ selectedClient }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [isBounceBack, setIsBounceBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bounceBackLoading, setBounceBackLoading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const getClientId = () => {
    if (selectedClient && selectedClient !== '') return selectedClient;
    return sessionStorage.getItem('clientId') || '6';
  };

  useEffect(() => {
    const fetchTrackingStatus = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/Crm/tracking-by-id?clientId=${getClientId()}`,
          { method: 'GET', headers: { accept: '*/*' } }
        );
        if (response.ok) {
          const data = await response.json();
          setIsTracking(data.isTracking || false);
          const bounceBack = data.bounceBack;
          setIsBounceBack(
            bounceBack === true ||
            bounceBack === 1 ||
            (typeof bounceBack === 'string' && bounceBack.toLowerCase() === 'true')
          );
        } else {
          setBanner({ type: 'error', text: 'Failed to load tracking status.' });
        }
      } catch {
        setBanner({ type: 'error', text: 'Failed to load tracking status.' });
      } finally {
        setLoading(false);
      }
    };
    fetchTrackingStatus();
  }, [selectedClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleTracking = async () => {
    setLoading(true);
    setBanner(null);
    const newState = !isTracking;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/updatetracking?clientId=${getClientId()}&IsTracking=${newState}`,
        { method: 'POST', headers: { accept: '*/*' }, body: '' }
      );
      if (response.ok) {
        setIsTracking(newState);
        setBanner({
          type: 'success',
          text: `Email tracking ${newState ? 'enabled' : 'disabled'} successfully.`,
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch {
      setBanner({
        type: 'error',
        text: 'Could not update tracking settings. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBounceBack = async () => {
    setBounceBackLoading(true);
    setBanner(null);
    const newState = !isBounceBack;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/updatebounceback?clientId=${getClientId()}&bounceBack=${newState}`,
        { method: 'POST', headers: { accept: '*/*' }, body: '' }
      );
      if (response.ok) {
        setIsBounceBack(newState);
        setBanner({
          type: 'success',
          text: `Bounceback deletion ${newState ? 'enabled' : 'disabled'} successfully.`,
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch {
      setBanner({
        type: 'error',
        text: 'Could not update the bounceback setting. Please try again.',
      });
    } finally {
      setBounceBackLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Email tracking</h2>
        <div className={cardClass}>
          <ToggleRow
            icon={<Mail className="h-5 w-5" />}
            title="Email tracking"
            description="Track opens and clicks for emails sent to contacts."
            checked={isTracking}
            busy={loading}
            disabled={loading}
            statusText={loading ? 'Updating…' : isTracking ? 'Enabled' : 'Disabled'}
            onToggle={handleToggleTracking}
          />

          <div className="my-5 border-t border-[#e8eaee]" />

          <ToggleRow
            icon={<RotateCcw className="h-5 w-5" />}
            title="Delete bounceback emails"
            description="Remove bounce-back replies from the inbox automatically for this client."
            checked={isBounceBack}
            busy={loading || bounceBackLoading}
            disabled={loading || bounceBackLoading}
            statusText={
              loading
                ? 'Loading…'
                : bounceBackLoading
                ? 'Updating…'
                : isBounceBack
                ? 'Enabled'
                : 'Disabled'
            }
            onToggle={handleToggleBounceBack}
          />

          <p className={hintClass}>
            Changes take effect immediately for all future emails in all campaigns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
