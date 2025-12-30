import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../Redux/store';
import { saveUserCredit } from '../slices/authSLice';
import API_BASE_URL from '../config';

export const useCreditRefresh = () => {
  const dispatch = useDispatch();
  const credits = useSelector((state: RootState) => state.auth.credits);
  const userId = useSelector((state: RootState) => state.auth.userId);

  const refreshCredits = useCallback(async (clientId?: string) => {
    try {
      const effectiveUserId = clientId || userId;
      if (!effectiveUserId) return;

      const response = await fetch(
        `${API_BASE_URL}/api/Crm/user_credit?clientId=${effectiveUserId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        const creditData = await response.json();
        dispatch(saveUserCredit(creditData));
        return creditData;
      }
    } catch (error) {
      console.error('Error refreshing credits:', error);
    }
  }, [dispatch, userId]);

  // Listen for credit update events
  useEffect(() => {
    const handleCreditUpdate = (event: CustomEvent) => {
      const { clientId } = event.detail;
      refreshCredits(clientId);
    };

    window.addEventListener('creditUpdated', handleCreditUpdate as EventListener);
    
    return () => {
      window.removeEventListener('creditUpdated', handleCreditUpdate as EventListener);
    };
  }, [refreshCredits]);

  return { credits, refreshCredits };
};