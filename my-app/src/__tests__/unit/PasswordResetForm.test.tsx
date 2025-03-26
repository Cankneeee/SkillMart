import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PasswordResetForm from '@/components/PasswordResetForm';
import { updatePassword, getUser } from '@/utils/auth';
import { validatePassword } from '@/utils/validation';
import { useRouter } from 'next/navigation';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth utilities
jest.mock('@/utils/auth', () => ({
  updatePassword: jest.fn(),
  getUser: jest.fn(),
}));

// Mock the validation utility
jest.mock('@/utils/validation', () => ({
  validatePassword: jest.fn(),
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
  userEmailDisplay: 'mock-user-email-display',
}));

jest.mock('@/styles/Modal.module.css', () => ({
  modal: 'mock-modal',
}));

describe('PasswordResetForm', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    // Default: no validation errors
    (validatePassword as jest.Mock).mockReturnValue(null);
    // Default: no user
    (getUser as jest.Mock).mockResolvedValue(null);
  });

  test('renders the password reset form', () => {
    render(<PasswordResetForm />);
    
    expect(screen.getByRole('heading')).toHaveTextContent('Set New Password');
    expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });

  test('displays user email when available', async () => {
    // Mock getUser to return a user with email
    (getUser as jest.Mock).mockResolvedValue({ email: 'user@example.com' });

    render(<PasswordResetForm />);
    
    // Wait for user email to be displayed
    await waitFor(() => {
      expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
    });
  });

  test('validates password strength', async () => {
    // Mock password validation to return an error
    (validatePassword as jest.Mock).mockReturnValue('Password must be at least 8 characters long.');

    render(<PasswordResetForm />);
    
    const newPasswordInput = screen.getByPlaceholderText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password') as HTMLInputElement;
    
    fireEvent.change(newPasswordInput, { target: { value: 'weak' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } });
    
    const resetButton = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(resetButton);
    
    // Check for validation error message
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
    });
    
    // Verify updatePassword was not called
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test('checks that passwords match', async () => {
    render(<PasswordResetForm />);
    
    const newPasswordInput = screen.getByPlaceholderText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password') as HTMLInputElement;
    
    fireEvent.change(newPasswordInput, { target: { value: 'StrongP@ss123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentP@ss123' } });
    
    const resetButton = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(resetButton);
    
    // Check for password match error message
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
    
    // Verify updatePassword was not called
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test('shows loading state during password reset', async () => {
    // Mock updatePassword to not resolve immediately
    (updatePassword as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    render(<PasswordResetForm />);
    
    const newPasswordInput = screen.getByPlaceholderText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password') as HTMLInputElement;
    
    fireEvent.change(newPasswordInput, { target: { value: 'StrongP@ss123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongP@ss123' } });
    
    const resetButton = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(resetButton);
    
    // Button should show loading state
    expect(screen.getByRole('button')).toHaveTextContent('Resetting...');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('shows success modal on successful password reset', async () => {
    // Mock successful password update
    (updatePassword as jest.Mock).mockResolvedValueOnce({ error: null });

    render(<PasswordResetForm />);
    
    const newPasswordInput = screen.getByPlaceholderText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password') as HTMLInputElement;
    
    fireEvent.change(newPasswordInput, { target: { value: 'StrongP@ss123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongP@ss123' } });
    
    const resetButton = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(resetButton);
    
    // Wait for success modal
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByText('Password Reset Successful')).toBeInTheDocument();
    });
  });

  test('shows error when password update fails', async () => {
    // Mock failed password update
    (updatePassword as jest.Mock).mockResolvedValueOnce({ 
      error: { message: 'Failed to update password' } 
    });

    render(<PasswordResetForm />);
    
    const newPasswordInput = screen.getByPlaceholderText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password') as HTMLInputElement;
    
    fireEvent.change(newPasswordInput, { target: { value: 'StrongP@ss123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongP@ss123' } });
    
    const resetButton = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(resetButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to update password')).toBeInTheDocument();
    });
  });

  test('redirects to login after successful password reset', async () => {
    // Mock successful password update
    (updatePassword as jest.Mock).mockResolvedValueOnce({ error: null });
    
    // Mock timers
    jest.useFakeTimers();

    render(<PasswordResetForm />);
    
    const newPasswordInput = screen.getByPlaceholderText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password') as HTMLInputElement;
    
    fireEvent.change(newPasswordInput, { target: { value: 'StrongP@ss123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongP@ss123' } });
    
    const resetButton = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(resetButton);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
    
    // Fast-forward timer
    jest.advanceTimersByTime(3000);
    
    // Should redirect to login
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
    
    // Restore timers
    jest.useRealTimers();
  });
});