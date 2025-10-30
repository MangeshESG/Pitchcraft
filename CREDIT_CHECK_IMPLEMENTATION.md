# Credit Check Implementation

This document describes the implementation of the credit check functionality that shows a popup reminder when user credits are 0.

## Overview

The credit check system monitors user credits and displays a modal popup when credits reach 0, prompting users to purchase a plan to continue using the service.

## Components Added

### 1. CreditCheckModal Component
- **Location**: `src/components/common/CreditCheckModal.tsx`
- **Purpose**: Displays a modal popup when user credits are 0
- **Features**:
  - Uses the existing AppModal component for consistent styling
  - Shows current credit balance
  - Provides "Buy Plan" button that navigates to `/planes`
  - Follows the same design patterns as other modals in the app

### 2. useCreditCheck Hook
- **Location**: `src/hooks/useCreditCheck.tsx`
- **Purpose**: Manages credit checking logic and modal state
- **Features**:
  - Fetches user credits from `api/Crm/user_credit` endpoint
  - Manages modal visibility state
  - Prevents multiple simultaneous API calls
  - Updates Redux store with credit information

## Integration Points

### 1. MainPage Component
- Added credit check on component mount
- Added credit check when user changes (effectiveUserId changes)
- Added credit check before starting email generation process
- Integrated CreditCheckModal component

### 2. LoginPage Component
- Added credit check after successful login
- Added credit check after OTP verification
- Uses the existing API structure

### 3. Redux Store
- Uses existing `saveUserCredit` action from `authSlice`
- Stores credit information in Redux state

## API Integration

The implementation uses the existing API endpoint:
```
GET /api/Crm/user_credit?clientId={userId}
```

This endpoint returns the user's current credit balance as a number.

## User Flow

1. **After Login**: Credits are fetched and stored in Redux
2. **On Main Page Load**: Credits are checked and modal shows if credits = 0
3. **Before Email Generation**: Credits are verified before starting the process
4. **Modal Interaction**: 
   - User sees credit balance and warning message
   - "Buy Plan" button navigates to `/planes` page
   - "Close" button dismisses the modal

## Design Consistency

The implementation follows the existing design patterns:
- Uses AppModal component for consistent styling
- Follows the same CSS classes and color scheme
- Uses the same modal behavior as other popups
- Integrates with existing routing structure

## Testing

A test file is included at `src/components/common/CreditCheckModal.test.tsx` that covers:
- Modal rendering when open/closed
- User interactions
- Navigation behavior

## Configuration

The credit check is automatically disabled for demo accounts by checking:
```javascript
sessionStorage.getItem("isDemoAccount") !== "true"
```

## Future Enhancements

Potential improvements could include:
- Credit threshold warnings (e.g., when credits < 10)
- Different modal messages based on credit levels
- Auto-refresh credits after successful payment
- Credit usage tracking and notifications