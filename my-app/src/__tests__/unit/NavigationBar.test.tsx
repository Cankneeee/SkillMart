import { render, screen, fireEvent } from '@testing-library/react';
import NavigationBar from '@/components/NavigationBar';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { signOut } from '@/utils/auth';

/**
 * Mock dependencies
 * 
 * We mock all external dependencies to:
 * 1. Isolate the component behavior
 * 2. Prevent actual network/API calls
 * 3. Control the test environment
 */

// Mock Next.js router to track navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock user context to simulate logged-in and logged-out states
jest.mock('@/context/UserContext', () => ({
  useUser: jest.fn(),
}));

// Mock Supabase client to avoid actual database connections
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({})),
}));

// Mock signOut function to verify it's called with correct parameters
jest.mock('@/utils/auth', () => ({
  signOut: jest.fn(),
}));

// Create a simple implementation of Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock the CategoriesTab component to simplify testing and verify it's displayed
jest.mock('@/components/CategoriesTab', () => {
  return function MockCategoriesTab({ show, onClose }: { show: boolean; onClose: () => void }) {
    return show ? <div data-testid="categories-tab">Categories Tab</div> : null;
  };
});

// Mock Next.js Image component to avoid actual image loading
jest.mock('next/image', () => {
  return function MockImage({ src, alt, className, width, height }: { 
    src: string; 
    alt: string; 
    className?: string; 
    width: number; 
    height: number;
  }) {
    return <img src={src} alt={alt} className={className} width={width} height={height} />;
  };
});

// Mock CSS modules
jest.mock('@/styles/NavigationBar.module.css', () => ({
  navbar: 'mock-navbar-class',
  navContainer: 'mock-nav-container-class',
  brand: 'mock-brand-class',
  navbarToggle: 'mock-navbar-toggle-class',
  navLinks: 'mock-nav-links-class',
  navLink: 'mock-nav-link-class',
  searchForm: 'mock-search-form-class',
  searchContainer: 'mock-search-container-class',
  searchBar: 'mock-search-bar-class',
  searchIcon: 'mock-search-icon-class',
  rightSection: 'mock-right-section-class',
  profileDropdown: 'mock-profile-dropdown-class',
  username: 'mock-username-class',
  profilePicture: 'mock-profile-picture-class',
  profileIcon: 'mock-profile-icon-class',
  dropdownMenu: 'mock-dropdown-menu-class',
  dropdownItem: 'mock-dropdown-item-class',
  btnSignup: 'mock-btn-signup-class',
}));

describe('NavigationBar', () => {
  // Setup mock router for testing navigation
  const mockRouter = {
    push: jest.fn(),
  };
  
  beforeEach(() => {
    // Clear all mock function calls between tests
    jest.clearAllMocks();
    // Set up the router mock for each test
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  /**
   * Basic rendering tests
   * These verify the component renders correctly in different states
   */
  
  test('renders the brand logo', () => {
    // Simulate a logged-out user
    (useUser as jest.Mock).mockReturnValue({ username: null, profilePicture: null });
    
    render(<NavigationBar />);
    // Verify the brand logo is displayed
    expect(screen.getByText('SkillMart')).toBeInTheDocument();
  });

  test('renders login and signup links when user is not logged in', () => {
    // Simulate a logged-out user
    (useUser as jest.Mock).mockReturnValue({ username: null, profilePicture: null });
    
    render(<NavigationBar />);
    // Verify auth links are present for guests
    expect(screen.getByText('Log In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  test('renders user dropdown when user is logged in', () => {
    // Simulate a logged-in user with a profile picture
    (useUser as jest.Mock).mockReturnValue({ 
      username: 'testuser', 
      profilePicture: '/test-profile.jpg' 
    });
    
    render(<NavigationBar />);
    // Verify the username appears in the navbar
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  /**
   * Interaction tests
   * These verify the component responds correctly to user interactions
   */
  
  test('opens categories tab when Explore is clicked', () => {
    // Simulate a logged-out user
    (useUser as jest.Mock).mockReturnValue({ username: null, profilePicture: null });
    
    render(<NavigationBar />);
    
    // Find and click the Explore link
    const exploreLink = screen.getByText('Explore');
    if (exploreLink) {
      fireEvent.click(exploreLink);
    }
    
    // Verify the categories tab is now visible
    expect(screen.getByTestId('categories-tab')).toBeInTheDocument();
  });

  test('performs search when form is submitted', () => {
    // Simulate a logged-out user
    (useUser as jest.Mock).mockReturnValue({ username: null, profilePicture: null });
    
    render(<NavigationBar />);
    
    // Enter a search term
    const searchInput = screen.getByPlaceholderText('Search listings or users...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Submit the search form
    const form = searchInput.closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    
    // Verify router.push was called with the correctly encoded search URL
    expect(mockRouter.push).toHaveBeenCalledWith('/browse?q=test%20search');
  });

  test('does not navigate on empty search', () => {
    // Simulate a logged-out user
    (useUser as jest.Mock).mockReturnValue({ username: null, profilePicture: null });
    
    render(<NavigationBar />);
    
    // Enter only whitespace in the search
    const searchInput = screen.getByPlaceholderText('Search listings or users...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: '   ' } });
    
    // Submit the search form
    const form = searchInput.closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    
    // Verify no navigation occurred for empty search
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  test('logs out user when logout is clicked', () => {
    // Simulate a logged-in user
    (useUser as jest.Mock).mockReturnValue({ 
      username: 'testuser', 
      profilePicture: '/test-profile.jpg' 
    });
    
    render(<NavigationBar />);
    
    // Open the dropdown menu using the username element
    // Using getByRole to find the dropdown toggle button to avoid null issues
    const dropdownToggle = screen.getByText('testuser').closest('button') || 
                          screen.getByRole('button', { name: /testuser/i });
    fireEvent.click(dropdownToggle);
    
    // Click the logout button
    const logoutButton = screen.getByText('Log Out');
    fireEvent.click(logoutButton);
    
    // Verify the signOut function was called with the correct redirect path
    expect(signOut).toHaveBeenCalledWith('/login');
  });
});