import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '@/components/LoginForm';
import { signInWithEmail, redirectIfAuthenticated, isEmailRegistered } from '@/utils/auth';
import { useRouter } from 'next/navigation';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth utilities
jest.mock('@/utils/auth', () => ({
  signInWithEmail: jest.fn(),
  redirectIfAuthenticated: jest.fn(),
  isEmailRegistered: jest.fn(),
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

describe('LoginForm', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    // Default mock for redirectIfAuthenticated (no redirection by default)
    (redirectIfAuthenticated as jest.Mock).mockImplementation(() => {});
  });

  test('renders the login form with all elements', () => {
    render(<LoginForm />);
    
    expect(screen.getByRole('heading')).toHaveTextContent('Log In');
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();
    expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  test('shows loading state during login attempt', async () => {
    // Mock email existence check
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(true);
    // Mock login method with pending promise
    (signInWithEmail as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const loginButton = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(loginButton);
    
    // Button should show loading state
    expect(screen.getByRole('button')).toHaveTextContent('Logging in...');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('shows error when email is not registered', async () => {
    // Mock email not registered
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(false);

    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const loginButton = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(loginButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Email is not registered.')).toBeInTheDocument();
    });
  });

  test('shows error when password is incorrect', async () => {
    // Mock email existence check (email exists)
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(true);
    // Mock login error
    (signInWithEmail as jest.Mock).mockResolvedValueOnce({ 
      data: null,
      error: { message: 'Invalid login credentials' } 
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const loginButton = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(loginButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Incorrect password. Please try again.')).toBeInTheDocument();
    });
  });

  test('navigates to /browse on successful login', async () => {
    // Mock email existence check (email exists)
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(true);
    // Mock successful login
    (signInWithEmail as jest.Mock).mockResolvedValueOnce({ 
      data: { user: { id: '123' } },
      error: null
    });

    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const loginButton = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(loginButton);
    
    // Wait for navigation
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/browse');
    });
  });

  test('clears errors when input values change', async () => {
    // Mock email not registered for first attempt
    (isEmailRegistered as jest.Mock).mockResolvedValueOnce(false);

    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const loginButton = screen.getByRole('button', { name: 'Log In' });
    fireEvent.click(loginButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Email is not registered.')).toBeInTheDocument();
    });
    
    // Change email input - error should clear
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    
    expect(screen.queryByText('Email is not registered.')).not.toBeInTheDocument();
  });
});