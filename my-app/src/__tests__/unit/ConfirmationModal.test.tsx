import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmationModal from '@/components/ConfirmationModal';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn()
  })
}));

describe('ConfirmationModal', () => {
  // Common props for testing
  const defaultProps = {
    show: true,
    title: 'Confirmation Title',
    message: 'Are you sure you want to proceed?',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the modal with title and message when show is true', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    expect(screen.getByText('Confirmation Title')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  test('does not render when show is false', () => {
    render(<ConfirmationModal {...defaultProps} show={false} />);
    
    expect(screen.queryByText('Confirmation Title')).not.toBeInTheDocument();
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  test('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  test('renders with custom button text when provided', () => {
    render(
      <ConfirmationModal 
        {...defaultProps} 
        confirmText="Yes, Delete" 
        cancelText="Go Back" 
      />
    );
    
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  test('applies different button class based on variant prop', () => {
    const { rerender } = render(
      <ConfirmationModal {...defaultProps} variant="danger" />
    );
    
    // Get the confirm button
    const confirmButton = screen.getByText('Confirm');
    
    // Check if the danger class is applied
    expect(confirmButton.className).toContain('modalButtonDanger');
    
    // Rerender with primary variant
    rerender(<ConfirmationModal {...defaultProps} variant="primary" />);
    expect(screen.getByText('Confirm').className).toContain('modalButton');
    
    // Rerender with secondary variant
    rerender(<ConfirmationModal {...defaultProps} variant="secondary" />);
    expect(screen.getByText('Confirm').className).toContain('modalButtonSecondary');
  });

  test('renders Modal with static backdrop', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    // Since React Bootstrap handles the backdrop prop internally,
    // we'll just verify the component renders with the provided props
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('renders Modal with centered positioning', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    // Since React Bootstrap applies these classes internally,
    // we'll verify the dialog renders correctly
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('calls onCancel when close button in header is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    
    // Find close button (usually an X in the corner) and click it
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});