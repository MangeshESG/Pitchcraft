import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../Redux/store';
import { saveUserCredit } from '../slices/authSLice';
import API_BASE_URL from '../config';

export const useCreditCheck = () => {
  const dispatch = useDispatch();
  const { userId, credits } = useSelector((state: RootState) => state.auth);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);

  const checkUserCredits = async (clientId?: string | number | null) => {
    if (isCheckingCredits) return; // Prevent multiple simultaneous calls
    
    setIsCheckingCredits(true);
    try {
      const effectiveUserId = clientId?.toString() || userId;
      if (!effectiveUserId) return;

      const response = await fetch(
        `${API_BASE_URL}/api/Crm/user_credit?clientId=${effectiveUserId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const creditData = await response.json();
        dispatch(saveUserCredit(creditData));
        
        // Show modal only based on canGenerate flag
        if (creditData && !creditData.canGenerate) {
          setShowCreditModal(true);
        }
        
        return creditData;
      } else {
        console.error('Failed to fetch user credits');
        return null;
      }
    } catch (error) {
      console.error('Error checking user credits:', error);
      return null;
    } finally {
      setIsCheckingCredits(false);
    }
  };

  const closeCreditModal = () => {
    setShowCreditModal(false);
  };

  const handleSkipModal = () => {
    setShowCreditModal(false);
  };

  return {
    credits,
    showCreditModal,
    checkUserCredits,
    closeCreditModal,
    handleSkipModal,
    isCheckingCredits,
  };
};