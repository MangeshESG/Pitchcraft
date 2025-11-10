import React from 'react';
import AppModal from './AppModal';

interface CreditCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: any;
  onSkip: () => void;
  setTab: (tab: string) => void;
}

const CreditCheckModal: React.FC<CreditCheckModalProps> = ({ isOpen, onClose, credits, onSkip, setTab }) => {
  const handleBuyPlan = () => {
    onClose();
    setTab('MyPlan');
  };

  const handleSkip = () => {
    localStorage.setItem('creditModalSkipped', 'true');
    onSkip();
    onClose();
  };

  const getModalMessage = () => {
    if (credits?.monthlyLimitExceeded) {
      return "You have reached your monthly generation limit. Please upgrade your plan or wait until next month to continue generating emails.";
    }
    const totalCredits = credits?.total || 0;
    return `Your current credit balance is ${totalCredits}. You need credits to generate personalized emails. You can explore the website or purchase a plan to continue generating emails.`;
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      type="confirm"
      title={credits?.monthlyLimitExceeded ? "Monthly limit exceeded" : "Credit balance low"}
      message={getModalMessage()}
      confirmText="Buy plan"
      cancelText="Skip for now"
      onConfirm={handleBuyPlan}
      onCancel={handleSkip}
      size="medium"
      closeOnOverlayClick={true}
    />
  );
};

export default CreditCheckModal;