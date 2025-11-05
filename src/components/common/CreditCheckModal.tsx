import React from 'react';
import AppModal from './AppModal';
import { useNavigate } from 'react-router-dom';

interface CreditCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: number;
  onSkip: () => void;
}

const CreditCheckModal: React.FC<CreditCheckModalProps> = ({ isOpen, onClose, credits, onSkip }) => {
  const navigate = useNavigate();

  const handleBuyPlan = () => {
    onClose();
    navigate('/plans'); // Navigate to plans page
  };

  const handleSkip = () => {
    localStorage.setItem('creditModalSkipped', 'true');
    onSkip();
    onClose();
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      type="confirm"
      title="Credit balance low"
      message={`Your current credit balance is ${credits}. You need credits to generate personalized emails. You can explore the website or purchase a plan to continue generating emails.`}
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