# Gmail OAuth Integration - Implementation Guide

## Overview
This implementation provides a popup-based Gmail OAuth flow that integrates with your existing backend APIs.

## Files Created

### 1. Frontend Component
- **Location**: `src/components/feature/GmailOAuthButton.tsx`
- **Purpose**: Reusable React component for Gmail OAuth button with popup handling

### 2. OAuth Callback Pages
- **Success Page**: `public/oauth-success.html`
- **Error Page**: `public/oauth-error.html`
- **Purpose**: HTML pages that send messages to parent window and close popup

## Backend Requirements

Your backend should return these HTML pages from the OAuth callback endpoint:

### Success Response
```csharp
// In your /api/google/callback endpoint
return Content(System.IO.File.ReadAllText("path/to/oauth-success.html"), "text/html");
```

### Error Response
```csharp
// In case of error
return Content(System.IO.File.ReadAllText("path/to/oauth-error.html"), "text/html");
```

## Integration in Mail.tsx

Add the import at the top:
```typescript
import GmailOAuthButton from './GmailOAuthButton';
```

Replace the "Connect Gmail" button section with:
```typescript
{mailboxSubTab === "inbox" && !isDemoAccount && (
  <GmailOAuthButton
    clientId={effectiveUserId}
    onSuccess={() => {
      setToastMessage('Gmail connected successfully!');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 6000);
      fetchInboxCredentials(); // Refresh inbox list
    }}
    onError={(message) => {
      setToastMessage(message);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 6000);
    }}
  />
)}
```

## How It Works

1. **User clicks "Connect Gmail"**
   - Opens popup window pointing to `/api/google/login?clientId={id}`
   - Popup size: 500x600, centered on screen

2. **Backend OAuth Flow**
   - User authenticates with Google
   - Backend saves tokens
   - Backend returns `oauth-success.html` or `oauth-error.html`

3. **Callback Page**
   - Sends `postMessage('success')` or `postMessage('error')` to opener window
   - Automatically closes after 1.5-2 seconds

4. **Main Window**
   - Listens for message event
   - Shows success/error toast
   - Refreshes inbox credentials list

## Security Considerations

### Production Deployment
In `GmailOAuthButton.tsx`, uncomment and configure origin validation:
```typescript
const handleMessage = (event: MessageEvent) => {
  // Validate origin for security
  if (event.origin !== window.location.origin) return;
  
  // ... rest of the code
};
```

### Backend Security
- Validate state parameter to prevent CSRF
- Use HTTPS in production
- Implement proper token storage and encryption
- Add rate limiting to OAuth endpoints

## Testing

### Test Popup Blocker
1. Open browser with popup blocker enabled
2. Click "Connect Gmail"
3. Should show error: "Popup blocked! Please allow popups for this site."

### Test Success Flow
1. Click "Connect Gmail"
2. Complete OAuth in popup
3. Popup should close automatically
4. Main window should show success message
5. Inbox list should refresh

### Test Error Flow
1. Simulate OAuth error in backend
2. Backend should return `oauth-error.html`
3. Popup should close automatically
4. Main window should show error message

## Troubleshooting

### Popup Not Opening
- Check if popup blocker is enabled
- Verify API_BASE_URL is correct
- Check browser console for errors

### Message Not Received
- Verify `window.opener` exists in callback page
- Check if origin validation is blocking messages
- Ensure event listener is attached before popup opens

### Popup Not Closing
- Check if `window.close()` is being called
- Some browsers prevent closing windows not opened by script
- Verify setTimeout is executing

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (use polyfills if needed)

## Additional Features

### Add Loading State
The component already includes loading state with disabled button and "Connecting..." text.

### Add Retry Logic
```typescript
const [retryCount, setRetryCount] = useState(0);

const handleConnectGmail = () => {
  if (retryCount >= 3) {
    onError('Maximum retry attempts reached. Please try again later.');
    return;
  }
  setRetryCount(prev => prev + 1);
  // ... rest of the code
};
```

### Add Timeout
```typescript
useEffect(() => {
  if (!popup) return;
  
  const timeout = setTimeout(() => {
    if (popup && !popup.closed) {
      popup.close();
      onError('Connection timeout. Please try again.');
      setIsConnecting(false);
    }
  }, 60000); // 60 seconds
  
  return () => clearTimeout(timeout);
}, [popup]);
```

## API Endpoints Reference

### GET /api/google/login
- **Query Params**: `clientId` (required)
- **Response**: Redirects to Google OAuth consent screen

### GET /api/google/callback
- **Query Params**: `code`, `state` (from Google)
- **Response**: HTML page (`oauth-success.html` or `oauth-error.html`)
- **Side Effects**: Saves OAuth tokens to database

## Notes
- The component is fully typed with TypeScript
- Uses existing toast notification system
- Integrates seamlessly with current Mail.tsx structure
- No external dependencies required
- Production-ready with proper error handling
