import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUpForm from '@/components/SignUpForm';
import { signUpWithEmail, isEmailRegistered } from '@/utils/auth';
import { updateUserProfile } from '@/lib/database';
import { useRouter } from 'next/navigation';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth utilities
jest.mock('@/utils/auth', () => ({
  signUpWithEmail: jest.fn(),
  isEmailRegistered: jest.fn(),
}));

// Mock the database utility
jest.mock('@/lib/database', () => ({
  updateUserProfile: jest.fn(),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
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
  link: 'mock-link',
}));

describe('SignUpForm', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    // Default: email not registered
    (isEmailRegistered as jest.Mock).mockResolvedValue(false);
  });

  test('renders the signup form with all fields', () => {
    render(<SignUpForm />);
    
    expect(screen.getByRole('heading')).toHaveTextContent('Sign Up');
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    expect(screen.getByText('Log In')).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    // Mock signUpWithEmail to track if it's called
    const mockSignUp = jest.fn();
    (signUpWithEmail as jest.Mock).mockImplementation(mockSignUp);
    
    render(<SignUpForm />);
    
    // Submit without filling in any fields
    const signupButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signupButton);
    
    // Wait a bit to ensure form processing completed
    await waitFor(() => {
      // The signUp function should not be called if validation fails
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  test('validates email format', async () => {
    // Mock signUpWithEmail to track if it's called
    const mockSignUp = jest.fn();
    (signUpWithEmail as jest.Mock).mockImplementation(mockSignUp);
    
    render(<SignUpForm />);
    
    // Fill in username and password but use invalid email
    const usernameInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    // Check if it's an email input with validation
    expect(emailInput.type).toBe('email');
    
    // Find the form element without using getByRole
    const form = emailInput.closest('form');
    
    // Submit the form directly
    if (form) {
      fireEvent.submit(form);
    } else {
      // If we can't find the form, submit by clicking the button
      const signupButton = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signupButton);
    }
    
    // Ensure the signUp function is not called due to invalid email
    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  test('validates password length', async () => {
    render(<SignUpForm />);
    
    // Fill in fields with short password
    const usernameInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'pass' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'pass' } });
    
    const signupButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signupButton);
    
    // Should show password length error
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  test('validates that passwords match', async () => {
    render(<SignUpForm />);
    
    // Fill in fields with non-matching passwords
    const usernameInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    
    const signupButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signupButton);
    
    // Should show passwords don't match error
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  test('checks if email is already registered', async () => {
    // Mock email already registered
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(true);
    
    render(<SignUpForm />);
    
    // Fill in all fields correctly
    const usernameInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    const signupButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signupButton);
    
    // Should show email already registered error
    await waitFor(() => {
      expect(screen.getByText('Email is already registered. Please log in.')).toBeInTheDocument();
    });
  });

  test('shows loading state during signup', async () => {
    // Mock signup to not resolve immediately
    (signUpWithEmail as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    
    render(<SignUpForm />);
    
    // Fill in all fields correctly
    const usernameInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    const signupButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signupButton);
    
    // Button should show loading state
    expect(screen.getByRole('button')).toHaveTextContent('Signing up...');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('handles successful signup', async () => {
    // Mock successful signup
    (signUpWithEmail as jest.Mock).mockResolvedValueOnce({ 
      data: { user: { id: '123' } },
      error: null
    });
    (updateUserProfile as jest.Mock).mockResolvedValueOnce(true);
    
    render(<SignUpForm />);
    
    // Fill in all fields correctly
    const usernameInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    const signupButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signupButton);
    
    // Wait for profile update and navigation
    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith('123', {
        email: 'new@example.com',
        username: 'testuser',
        profile_picture: undefined,
      });
      expect(mockRouter.push).toHaveBeenCalledWith('/browse');
    });
  });

  test('handles signup error', async () => {
    // Mock signup error
    (signUpWithEmail as jest.Mock).mockResolvedValueOnce({ 
      data: null,
      error: { message: 'Signup failed' }
    });
    
    render(<SignUpForm />);
    
    // Fill in all fields correctly
    const usernameInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password') as HTMLInputElement;
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    
    const signupButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signupButton);
    
    // Should show signup error
    await waitFor(() => {
      expect(screen.getByText('Signup failed')).toBeInTheDocument();
    });
  });

  test('input fields change value correctly', async () => {
    render(<SignUpForm />);
    
    // Select the username input
    const usernameInput = screen.getByPlaceholderText('Username') as HTMLInputElement;
    
    // Initial empty value
    expect(usernameInput.value).toBe('');
    
    // Change username input
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    
    // Check that the value was updated
    expect(usernameInput.value).toBe('testuser');
  });
});