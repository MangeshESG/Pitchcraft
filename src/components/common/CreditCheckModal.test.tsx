import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreditCheckModal from './CreditCheckModal';

const MockedCreditCheckModal = ({ isOpen, onClose, credits }: any) => (
  <BrowserRouter>
    <CreditCheckModal isOpen={isOpen} onClose={onClose} credits={credits} onSkip={() => {}} setTab={() => {}} />
  </BrowserRouter>
);

describe('CreditCheckModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  test('renders modal when isOpen is true', () => {
    render(
      <MockedCreditCheckModal 
        isOpen={true} 
        onClose={mockOnClose} 
        credits={0} 
      />
    );
    
    expect(screen.getByText(/Credit Balance Low/i)).toBeInTheDocument();
    expect(screen.getByText(/Your current credit balance is 0/i)).toBeInTheDocument();
  });

  test('does not render modal when isOpen is false', () => {
    render(
      <MockedCreditCheckModal 
        isOpen={false} 
        onClose={mockOnClose} 
        credits={0} 
      />
    );
    
    expect(screen.queryByText(/Credit Balance Low/i)).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <MockedCreditCheckModal 
        isOpen={true} 
        onClose={mockOnClose} 
        credits={0} 
      />
    );
    
    const closeButton = screen.getByText(/Close/i);
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});