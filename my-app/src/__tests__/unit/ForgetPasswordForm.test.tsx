import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgetPasswordForm from '@/components/ForgetPasswordForm';
import { resetPassword, isEmailRegistered } from '@/utils/auth';

// Mock the auth utilities
jest.mock('@/utils/auth', () => ({
  resetPassword: jest.fn(),
  isEmailRegistered: jest.fn(),
}));

// Mock the Modal from react-bootstrap with proper structure
jest.mock('react-bootstrap', () => {
  // Create mock components
  const ModalHeader = ({ children, closeButton }: { children: React.ReactNode; closeButton?: boolean }) => (
    <div data-testid="modal-header">{children}</div>
  );
  
  const ModalBody = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-body">{children}</div>
  );
  
  const ModalFooter = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-footer">{children}</div>
  );
  
  const ModalTitle = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-title">{children}</div>
  );
  
  // Create the Modal component with nested components
  const Modal = ({ children, show, onHide, className }: { 
    children: React.ReactNode; 
    show?: boolean; 
    onHide?: () => void; 
    className?: string;
  }) => (
    show ? <div data-testid="modal">{children}</div> : null
  );
  
  // Add nested components to Modal
  Modal.Header = ModalHeader;
  Modal.Body = ModalBody;
  Modal.Footer = ModalFooter;
  Modal.Title = ModalTitle;

  // Return the mock object with Button and Modal
  return {
    Modal: Modal,
    Button: ({ children, onClick, variant }: { 
      children: React.ReactNode; 
      onClick?: () => void; 
      variant?: string 
    }) => (
      <button onClick={onClick}>{children}</button>
    )
  };
});

// Mock CSS modules
jest.mock('@/styles/AuthForms.module.css', () => ({
  container: 'mock-container',
  heading: 'mock-heading',
  form: 'mock-form',
  input: 'mock-input',
  inputError: 'mock-input-error',
  errorMessage: 'mock-error-message',
  button: 'mock-button',
}));

jest.mock('@/styles/Modal.module.css', () => ({
  modal: 'mock-modal',
}));

describe('ForgetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the form with correct elements', () => {
    render(<ForgetPasswordForm />);
    
    expect(screen.getByRole('heading')).toHaveTextContent('Reset Password');
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
  });

  test('shows loading state when submitting', async () => {
    // Mock successful email check
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(true);
    // Mock pending reset password
    (resetPassword as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    render(<ForgetPasswordForm />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
    fireEvent.click(submitButton);
    
    // Button should show loading state
    expect(screen.getByRole('button')).toHaveTextContent('Sending...');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('shows error when email is not registered', async () => {
    // Mock email not registered
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(false);

    render(<ForgetPasswordForm />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
    fireEvent.click(submitButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Email is not registered.')).toBeInTheDocument();
    });
  });

  test('shows success modal when password reset email is sent', async () => {
    // Mock successful email check
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(true);
    // Mock successful password reset
    (resetPassword as jest.Mock).mockResolvedValueOnce({ error: null });

    render(<ForgetPasswordForm />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
    fireEvent.click(submitButton);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-body')).toHaveTextContent('A password reset link has been sent to your email');
    });
  });

  test('shows error when reset password fails', async () => {
    // Mock successful email check
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(true);
    // Mock failed password reset
    (resetPassword as jest.Mock).mockResolvedValueOnce({ 
      error: { message: 'Failed to send reset email' } 
    });

    render(<ForgetPasswordForm />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
    fireEvent.click(submitButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to send reset email')).toBeInTheDocument();
    });
  });

  test('clears error when email input changes', async () => {
    // Mock email not registered for initial attempt
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(false);

    render(<ForgetPasswordForm />);
    
    const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });
    fireEvent.click(submitButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Email is not registered.')).toBeInTheDocument();
    });
    
    // Change email input - error should clear
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });
    
    expect(screen.queryByText('Email is not registered.')).not.toBeInTheDocument();
  });
});