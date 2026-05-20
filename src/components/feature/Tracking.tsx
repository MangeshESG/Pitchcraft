import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import './blueprint/Template.new.css';
import { Mail } from 'lucide-react';

interface TrackingProps {
  selectedClient?: string;
}

const Tracking: React.FC<TrackingProps> = ({ selectedClient }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
        } else {
          showToast('Failed to load tracking status', 'error');
        }
      } catch {
        showToast('Failed to load tracking status', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchTrackingStatus();
  }, [selectedClient]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    if (type === 'success') {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 6000);
    } else {
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
    }
  };

  const handleToggleTracking = async () => {
    setLoading(true);
    const newState = !isTracking;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/updatetracking?clientId=${getClientId()}&IsTracking=${newState}`,
        { method: 'POST', headers: { accept: '*/*' }, body: '' }
      );
      if (response.ok) {
        setIsTracking(newState);
        showToast(`Email tracking ${newState ? 'enabled' : 'disabled'} successfully!`, 'success');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch {
      showToast('Failed to update tracking settings. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bp-list-wrap">
      <style>{`
        @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
        .tracking-card {
          background: #fff;
          border: 1px solid var(--bp-line);
          border-radius: 12px;
          overflow: hidden;
        }
        .tracking-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 24px;
        }
        .tracking-row__left {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }
        .tracking-row__icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--bp-brand-50);
          border: 1px solid var(--bp-brand-100);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--bp-brand);
        }
        .tracking-row__title {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--bp-ink);
          margin-bottom: 3px;
        }
        .tracking-row__sub {
          font-size: 13px;
          color: var(--bp-ink-faint);
          line-height: 1.4;
        }
        .tracking-row__right {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }
        .tracking-status-badge {
          font-size: 13px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .tracking-status-badge.enabled {
          background: var(--bp-brand-50);
          color: var(--bp-brand-d);
          border: 1px solid var(--bp-brand-100);
        }
        .tracking-status-badge.disabled {
          background: var(--bp-bg-2);
          color: var(--bp-ink-faint);
          border: 1px solid var(--bp-line-2);
        }
        .tracking-status-badge.loading {
          background: var(--bp-bg-2);
          color: var(--bp-ink-dim);
          border: 1px solid var(--bp-line);
        }
        .tracking-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .tracking-toggle:disabled { cursor: not-allowed; opacity: 0.6; }
        .tracking-toggle__knob {
          position: absolute;
          top: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.18);
          transition: left 0.2s ease;
        }
      `}</style>

      <div className="bp-page-header">
        <div className="bp-page-header__inner">
          <div>
            <div className="bp-eyebrow">CRM Settings</div>
            <h1 className="bp-page-title">Tracking</h1>
            <p className="bp-page-sub">
              Configure email tracking to monitor opens and clicks across your campaigns.
            </p>
          </div>
        </div>
      </div>

      <div className="bp-list-body">
        <div className="tracking-card">
          <div className="tracking-row">
            <div className="tracking-row__left">
              <div className="tracking-row__icon">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="tracking-row__title">Email tracking</div>
                <div className="tracking-row__sub">
                  Track opens and clicks for campaign emails sent to contacts.
                </div>
              </div>
            </div>
            <div className="tracking-row__right">
              <span
                className={`tracking-status-badge ${
                  loading ? 'loading' : isTracking ? 'enabled' : 'disabled'
                }`}
              >
                {loading ? 'Updating…' : isTracking ? 'Enabled' : 'Disabled'}
              </span>
              <button
                className="tracking-toggle"
                style={{ background: isTracking ? '#3f9f42' : '#e5e7eb' }}
                onClick={handleToggleTracking}
                disabled={loading}
                aria-label="Toggle email tracking"
              >
                <span
                  className="tracking-toggle__knob"
                  style={{ left: isTracking ? 22 : 3 }}
                />
              </button>
            </div>
          </div>
        </div>

        <p className="bp-tip" style={{ marginTop: 16 }}>
          Changes take effect immediately for all future emails in this client's campaigns.
        </p>
      </div>

      {showSuccessToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#E6F4EF', color: '#2F3A34', padding: '14px 22px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 6px 18px rgba(0,0,0,0.06)', zIndex: 99999,
          minWidth: 420, fontSize: 16, fontWeight: 500, overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: 4, width: '100%', background: '#1F9D74', animation: 'toastProgress 6s linear forwards' }} />
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1F9D74', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>✓</div>
          <div style={{ flex: 1 }}>{toastMessage}</div>
          <div onClick={() => setShowSuccessToast(false)} style={{ cursor: 'pointer', fontSize: 30, fontWeight: 500, color: '#6B7280', lineHeight: 1 }}>×</div>
        </div>
      )}

      {showErrorToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#FDECEC', color: '#2F3A34', padding: '14px 22px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 6px 18px rgba(0,0,0,0.06)', zIndex: 99999,
          minWidth: 420, fontSize: 16, fontWeight: 500, overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: 4, width: '100%', background: '#DC2626', animation: 'toastProgress 6s linear forwards' }} />
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DC2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>!</div>
          <div style={{ flex: 1 }}>{toastMessage}</div>
          <div onClick={() => setShowErrorToast(false)} style={{ cursor: 'pointer', fontSize: 30, fontWeight: 500, color: '#9CA3AF', lineHeight: 1 }}>×</div>
        </div>
      )}
    </div>
  );
};

export default Tracking;
