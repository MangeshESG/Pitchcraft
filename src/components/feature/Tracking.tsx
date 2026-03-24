import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import './ContactList.css';

interface TrackingProps {
  selectedClient?: string;
}

const Tracking: React.FC<TrackingProps> = ({ selectedClient }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Get effective client ID
  const getClientId = () => {
    if (selectedClient && selectedClient !== '') {
      return selectedClient;
    }
    return sessionStorage.getItem('clientId') || '6'; // fallback to 6
  };

  // Toast animation CSS
  const toastAnimation = `
    @keyframes toastProgress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `;

  // Fetch current tracking status on component mount
  useEffect(() => {
    const fetchTrackingStatus = async () => {
      const clientId = getClientId();
      setLoading(true);
      
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/Crm/tracking-by-id?clientId=${clientId}`,
          {
            method: 'GET',
            headers: {
              'accept': '*/*',
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setIsTracking(data.isTracking || false);
        } else {
          console.error('Failed to fetch tracking status:', response.status);
          setToastMessage('Failed to load tracking status');
          setShowErrorToast(true);
          setTimeout(() => setShowErrorToast(false), 6000);
        }
      } catch (err) {
        console.error('Error fetching tracking status:', err);
        setToastMessage('Failed to load tracking status');
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 6000);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingStatus();
  }, [selectedClient]);

  const handleToggleTracking = async () => {
    setLoading(true);

    const clientId = getClientId();
    const newTrackingState = !isTracking;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/updatetracking?clientId=${clientId}&IsTracking=${newTrackingState}`,
        {
          method: 'POST',
          headers: {
            'accept': '*/*',
          },
          body: ''
        }
      );

      if (response.ok) {
        setIsTracking(newTrackingState);
        setToastMessage(`Email tracking ${newTrackingState ? 'enabled' : 'disabled'} successfully!`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 6000);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      setToastMessage('Failed to update tracking settings. Please try again.');
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
      console.error('Error updating tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-campaigns-container"
    style={{ marginTop:"-60px" }}>
      <style>{toastAnimation}</style>

      <div className="section-wrapper" style={{ paddingTop: 0 }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Tracking settings
        </h2>
        <p style={{ marginBottom: 16, color: "#555" }}>
          Enable or disable email tracking for client campaigns.
        </p>

        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            maxWidth: 620,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              paddingBottom: 12,
              borderBottom: "1px solid #eee",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#333" }}>Email tracking</div>
              <div style={{ fontSize: 13, color: "#666" }}>
                Track opens and clicks for campaign emails.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: loading ? "#666" : isTracking ? "#2f6f3e" : "#6b7280",
                }}
              >
                {loading
                  ? "Loading..."
                  : isTracking
                    ? "Enabled"
                    : "Disabled"}
              </span>
              <button
                onClick={handleToggleTracking}
                disabled={loading}
                style={{
                  position: "relative",
                  width: 44,
                  height: 24,
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  background: isTracking ? "#3f9f42" : "#e5e7eb",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.2s ease",
                }}
                aria-label="Toggle email tracking"
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: isTracking ? 22 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    transition: "left 0.2s ease",
                  }}
                />
              </button>
            </div>
          </div>

          {loading && (
            <div style={{ marginTop: 12, color: "#2563eb", fontSize: 13 }}>
              Updating tracking settings...
            </div>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#E6F4EF",        // soft pastel green
            color: "#2F3A34",              // dark grey text (not black)
            padding: "14px 22px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            zIndex: 99999,
            minWidth: 420,
            fontSize: 16,
            fontWeight: 500,
            overflow: "hidden",
          }}
        >
          {/* Timer Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              width: "100%",
              background: "#1F9D74",  // darker green line like image
              animation: "toastProgress 6s linear forwards",
            }}
          />

          {/* Check Circle */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#1F9D74",   // same green as timer
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ✓
          </div>

          {/* Message */}
          <div style={{ flex: 1 }}>
            {toastMessage}
          </div>

          {/* Close Button */}
          <div
            onClick={() => setShowSuccessToast(false)}
            style={{
              cursor: "pointer",
              fontSize: 30,
              fontWeight: 500,
              color: "#6B7280",   // soft gray like screenshot
              lineHeight: 1,
            }}
          >
            ×
          </div>
        </div>
      )}

      {/* Error Toast */}
      {showErrorToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#FDECEC",        // pastel red background
            color: "#2F3A34",              // dark soft red text
            padding: "14px 22px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            zIndex: 99999,
            minWidth: 420,
            fontSize: 16,
            fontWeight: 500,
            overflow: "hidden",
          }}
        >
          {/* Timer Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              width: "100%",
              background: "#DC2626",   // strong red timer
              animation: "toastProgress 6s linear forwards",
            }}
          />

          {/* Error Circle */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#DC2626",   // same red as timer
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            !
          </div>

          {/* Message */}
          <div style={{ flex: 1 }}>
            {toastMessage}
          </div>

          {/* Close Button */}
          <div
            onClick={() => setShowErrorToast(false)}
            style={{
              cursor: "pointer",
              fontSize: 30,
              fontWeight: 500,
              color: "#9CA3AF",  // same gray as success close
              lineHeight: 1,
            }}
          >
            ×
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracking;
