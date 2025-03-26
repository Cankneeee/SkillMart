import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '@/components/Profile';
import { getUser, updatePassword } from '@/utils/auth';
import { getUserProfile, updateProfileField } from '@/lib/database';
import { uploadProfilePicture, useImageWithFallback } from '@/utils/imageUtils';
import { useUser } from '@/context/UserContext';

// Mock the auth utilities
jest.mock('@/utils/auth', () => ({
  getUser: jest.fn(),
  updatePassword: jest.fn(),
}));

// Mock the database utilities
jest.mock('@/lib/database', () => ({
  getUserProfile: jest.fn(),
  updateProfileField: jest.fn(),
}));

// Mock the image utilities
jest.mock('@/utils/imageUtils', () => ({
  DEFAULT_PROFILE_IMAGE: '/default-profile.jpg',
  useImageWithFallback: jest.fn(() => ({
    imgSrc: 'https://example.com/profile.jpg',
    onError: jest.fn(),
  })),
  uploadProfilePicture: jest.fn(),
}));

// Mock the validation utility
jest.mock('@/utils/validation', () => ({
  validatePassword: jest.fn(),
}));

// Mock the UserContext
jest.mock('@/context/UserContext', () => ({
  useUser: jest.fn(),
}));

// Mock the next/image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img 
      src={props.src} 
      alt={props.alt}
      width={props.width}
      height={props.height}
      className={props.className}
      data-testid="profile-image"
    />;
  },
}));

// Mock the react-icons components
jest.mock('react-icons/fa', () => ({
  FaPen: () => <div data-testid="edit-icon" />,
  FaCheck: () => <div data-testid="check-icon" />,
  FaTimes: () => <div data-testid="times-icon" />,
  FaUserCircle: () => <div data-testid="user-icon" />,
}));

// Mock the ImageSkeleton component
jest.mock('@/components/ImageSkeleton', () => {
  return function MockImageSkeleton({ className }: { className?: string }) {
    return <div data-testid="image-skeleton" className={className} />;
  };
});

// Mock CSS modules
jest.mock('@/styles/Profile.module.css', () => ({
  profileContainer: 'mock-profile-container',
  profileContent: 'mock-profile-content',
  profileHeader: 'mock-profile-header',
  profileImageContainer: 'mock-profile-image-container',
  profileImage: 'mock-profile-image',
  editProfileButton: 'mock-edit-profile-button',
  profileRow: 'mock-profile-row',
  profileLabel: 'mock-profile-label',
  profileValue: 'mock-profile-value',
  buttonColumn: 'mock-button-column',
  editButton: 'mock-edit-button',
  inputField: 'mock-input-field',
  inputFieldError: 'mock-input-field-error',
  loadingText: 'mock-loading-text',
  errorText: 'mock-error-text',
  successText: 'mock-success-text',
}));

describe('Profile Component', () => {
  // Mock data for tests
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
  };
  
  const mockProfile = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    profile_picture: 'https://example.com/profile.jpg',
  };
  
  const mockUserContext = {
    userId: 'user123',
    username: 'testuser',
    setUsername: jest.fn(),
    profilePicture: 'https://example.com/profile.jpg',
    setProfilePicture: jest.fn(),
    isAuthenticated: true,
  };
  
  // Set up mock implementations before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock UserContext
    (useUser as jest.Mock).mockReturnValue(mockUserContext);
    
    // Mock getUser to return a user
    (getUser as jest.Mock).mockResolvedValue(mockUser);
    
    // Mock getUserProfile to return a profile
    (getUserProfile as jest.Mock).mockResolvedValue(mockProfile);
    
    // Mock updateProfileField to succeed
    (updateProfileField as jest.Mock).mockResolvedValue({ error: null });
    
    // Mock updatePassword to succeed
    (updatePassword as jest.Mock).mockResolvedValue({ error: null });
    
    // Mock file input ref
    Object.defineProperty(global.window, 'HTMLInputElement', {
      value: jest.fn().mockImplementation(() => ({
        files: [{ type: 'image/png', size: 1024 }],
      })),
    });
  });

  test('fetches and displays user profile on mount', async () => {
    render(<Profile />);
    
    // Initially should show loading
    expect(screen.getByText(/Loading profile/)).toBeInTheDocument();
    
    // Wait for profile to load
    await waitFor(() => {
      expect(getUser).toHaveBeenCalled();
      expect(getUserProfile).toHaveBeenCalledWith('user123');
    });
    
    // Check that username is displayed
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  test('allows editing username', async () => {
    render(<Profile />);
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile/)).not.toBeInTheDocument();
    });
    
    // Find and click the edit button for username
    const editButtons = screen.getAllByTestId('edit-icon');
    fireEvent.click(editButtons[1]); // Username edit button (index 1)
    
    // Input field should appear
    const usernameInput = screen.getByDisplayValue('testuser');
    expect(usernameInput).toBeInTheDocument();
    
    // Change the username
    fireEvent.change(usernameInput, { target: { value: 'newusername' } });
    
    // Click the save button
    const saveButton = screen.getAllByTestId('check-icon')[0];
    fireEvent.click(saveButton);
    
    // Wait for the update to complete
    await waitFor(() => {
      expect(updateProfileField).toHaveBeenCalledWith('user123', 'username', 'newusername');
      expect(mockUserContext.setUsername).toHaveBeenCalledWith('newusername');
    });
    
    // Should show success message
    expect(screen.getByText(/Username updated successfully/)).toBeInTheDocument();
  });

  test('allows editing email', async () => {
    render(<Profile />);
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile/)).not.toBeInTheDocument();
    });
    
    // Find and click the edit button for email
    const editButtons = screen.getAllByTestId('edit-icon');
    fireEvent.click(editButtons[2]); // Email edit button (index 2)
    
    // Input field should appear
    const emailInput = screen.getByDisplayValue('test@example.com');
    expect(emailInput).toBeInTheDocument();
    
    // Change the email
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    
    // Click the save button
    const saveButton = screen.getAllByTestId('check-icon')[0];
    fireEvent.click(saveButton);
    
    // Wait for the update to complete
    await waitFor(() => {
      expect(updateProfileField).toHaveBeenCalledWith('user123', 'email', 'new@example.com');
    });
    
    // Should show success message
    expect(screen.getByText(/Email updated successfully/)).toBeInTheDocument();
  });

  test('validates email format', async () => {
    render(<Profile />);
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile/)).not.toBeInTheDocument();
    });
    
    // Find and click the edit button for email
    const editButtons = screen.getAllByTestId('edit-icon');
    fireEvent.click(editButtons[2]); // Email edit button (index 2)
    
    // Input field should appear
    const emailInput = screen.getByDisplayValue('test@example.com');
    
    // Change the email to an invalid format
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    // Click the save button
    const saveButton = screen.getAllByTestId('check-icon')[0];
    fireEvent.click(saveButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/)).toBeInTheDocument();
    });
    
    // updateProfileField should not have been called
    expect(updateProfileField).not.toHaveBeenCalled();
  });

  test('allows changing password', async () => {
    // Mock password validation to succeed
    jest.requireMock('@/utils/validation').validatePassword.mockReturnValue(null);
    
    render(<Profile />);
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile/)).not.toBeInTheDocument();
    });
    
    // Find and click the edit button for password
    const editButtons = screen.getAllByTestId('edit-icon');
    fireEvent.click(editButtons[3]); // Password edit button (index 3)
    
    // Password input fields should appear
    const newPasswordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
    
    // Enter new password
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    
    // Click the save button
    const saveButton = screen.getAllByTestId('check-icon')[0];
    fireEvent.click(saveButton);
    
    // Wait for the update to complete
    await waitFor(() => {
      expect(updatePassword).toHaveBeenCalledWith('newpassword123');
    });
    
    // Should show success message
    expect(screen.getByText(/Password updated successfully/)).toBeInTheDocument();
  });

  test('validates that passwords match', async () => {
    // Mock password validation to succeed
    jest.requireMock('@/utils/validation').validatePassword.mockReturnValue(null);
    
    render(<Profile />);
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile/)).not.toBeInTheDocument();
    });
    
    // Find and click the edit button for password
    const editButtons = screen.getAllByTestId('edit-icon');
    fireEvent.click(editButtons[3]); // Password edit button (index 3)
    
    // Password input fields should appear
    const newPasswordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
    
    // Enter mismatched passwords
    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    
    // Click the save button
    const saveButton = screen.getAllByTestId('check-icon')[0];
    fireEvent.click(saveButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/)).toBeInTheDocument();
    });
    
    // updatePassword should not have been called
    expect(updatePassword).not.toHaveBeenCalled();
  });

  test('validates password strength', async () => {
    // Mock password validation to fail
    jest.requireMock('@/utils/validation').validatePassword.mockReturnValue('Password must be at least 8 characters');
    
    render(<Profile />);
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading profile/)).not.toBeInTheDocument();
    });
    
    // Find and click the edit button for password
    const editButtons = screen.getAllByTestId('edit-icon');
    fireEvent.click(editButtons[3]); // Password edit button (index 3)
    
    // Password input fields should appear
    const newPasswordInput = screen.getByPlaceholderText('New Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
    
    // Enter weak password
    fireEvent.change(newPasswordInput, { target: { value: 'weak' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } });
    
    // Click the save button
    const saveButton = screen.getAllByTestId('check-icon')[0];
    fireEvent.click(saveButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument();
    });
    
    // updatePassword should not have been called
    expect(updatePassword).not.toHaveBeenCalled();
  });
});