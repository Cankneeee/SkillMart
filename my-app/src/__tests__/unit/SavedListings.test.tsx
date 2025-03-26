import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SavedListings from '@/components/SavedListings';
import * as databaseFunctions from '@/lib/database';
import { useRouter } from 'next/navigation';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock Suspense and other React components
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    // Fix the TypeScript error by explicitly typing the children prop
    Suspense: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock the database functions
jest.mock('@/lib/database', () => ({
  getUserSavedListings: jest.fn(),
  getCategories: jest.fn(),
  getListingTypes: jest.fn(),
  encodeCategory: jest.fn(),
  getListingRating: jest.fn(),
  getUserProfile: jest.fn()
}));

// Mock the supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({ 
    auth: { getSession: jest.fn() }
  }))
}));

// Mock the ListingCard component
jest.mock('@/components/ListingCard', () => {
  return jest.fn(() => <div data-testid="listing-card">Mocked Listing Card</div>);
});

// Mock the ListingCardSkeleton component
jest.mock('@/components/ListingCardSkeleton', () => {
  return jest.fn(() => <div data-testid="listing-card-skeleton">Loading...</div>);
});

// Mock the CSS module
jest.mock('@/styles/SavedListings.module.css', () => ({
  pageContainer: 'pageContainer',
  pageHeader: 'pageHeader',
  titleContainer: 'titleContainer',
  pageTitle: 'pageTitle',
  listingCount: 'listingCount',
  headerActions: 'headerActions',
  filterContainer: 'filterContainer',
  filterLabel: 'filterLabel',
  dropdownToggle: 'dropdownToggle',
  dropdownMenu: 'dropdownMenu',
  dropdownItem: 'dropdownItem',
  categorySection: 'categorySection',
  categoryTitleLink: 'categoryTitleLink',
  categoryTitle: 'categoryTitle',
  categoryArrow: 'categoryArrow',
  categoryCount: 'categoryCount',
  viewMoreContainer: 'viewMoreContainer',
  viewMoreLink: 'viewMoreLink',
  emptyState: 'emptyState',
  emptyStateSubtext: 'emptyStateSubtext',
  browseListingsBtn: 'browseListingsBtn'
}));

describe('SavedListings', () => {
  // Common test data
  const mockSavedListings = [
    {
      listing: {
        id: '1',
        title: 'Test Listing 1',
        description: 'Description 1',
        image_url: '/test1.jpg',
        listing_type: 'Service',
        category: 'Technology',
        user_id: 'user2'
      },
      saved_at: '2024-03-15T10:00:00Z',
      user_id: 'user1'
    },
    {
      listing: {
        id: '2',
        title: 'Test Listing 2',
        description: 'Description 2',
        image_url: '/test2.jpg',
        listing_type: 'Product',
        category: 'Crafts',
        user_id: 'user3'
      },
      saved_at: '2024-03-16T11:00:00Z',
      user_id: 'user1'
    },
    {
      listing: {
        id: '3',
        title: 'Test Listing 3',
        description: 'Description 3',
        image_url: '/test3.jpg',
        listing_type: 'Service',
        category: 'Services',
        user_id: 'user4'
      },
      saved_at: '2024-03-17T12:00:00Z',
      user_id: 'user1'
    }
  ];
  
  const mockCategories = ['Technology', 'Crafts', 'Services'];
  const mockListingTypes = ['All Types', 'Service', 'Product'];
  const mockUserId = 'user1';
  
  // Mock for supabase client
  const mockSupabase = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: mockUserId
            }
          }
        }
      })
    }
  };
  
  // Set up mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock router functions
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn()
    });
    
    // Mock supabase
    require('@/utils/supabase/client').createClient.mockReturnValue(mockSupabase);
    
    // Mock database functions
    (databaseFunctions.getUserSavedListings as jest.Mock).mockResolvedValue(mockSavedListings);
    (databaseFunctions.getCategories as jest.Mock).mockReturnValue(mockCategories);
    (databaseFunctions.getListingTypes as jest.Mock).mockReturnValue(mockListingTypes);
    (databaseFunctions.encodeCategory as jest.Mock).mockImplementation(
      (category) => category.toLowerCase().replace(/\s+/g, '-')
    );
    (databaseFunctions.getUserProfile as jest.Mock).mockResolvedValue({
      username: 'Test User',
      profile_picture: '/profile.jpg'
    });
    (databaseFunctions.getListingRating as jest.Mock).mockResolvedValue({ average: 4.5, count: 10 });
  });
  
  test('renders loading state initially', async () => {
    render(<SavedListings />);
    
    expect(screen.getByText(/Loading your saved listings/i)).toBeInTheDocument();
  });
  
  test('redirects to login when no session found', async () => {
    // Mock supabase to return no session
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null }
    });
    
    // Mock window.location.href
    const originalLocation = window.location;
    const mockLocation = { ...originalLocation, href: '' as any };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    });
    
    render(<SavedListings />);
    
    // Wait for the redirect
    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    });
    
    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true
    });
  });
  
  test('renders listings grouped by category when data is loaded', async () => {
    render(<SavedListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Check that page title is displayed
    expect(screen.getByText('Saved Listings')).toBeInTheDocument();
    
    // Check that listing count is displayed
    expect(screen.getByText(/\(3 listings\)/i)).toBeInTheDocument();
    
    // Check that category titles are displayed
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Crafts')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    
    // Check that listings are displayed
    expect(screen.getAllByTestId('listing-card').length).toBe(3);
  });
  
  test('filters listings when listing type is selected', async () => {
    render(<SavedListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Find and click the dropdown toggle
    const dropdownToggle = screen.getByText('All Types');
    fireEvent.click(dropdownToggle);
    
    // Click on a listing type
    const serviceOption = screen.getByText('Service');
    fireEvent.click(serviceOption);
    
    // Verify that filtering was applied - should only show Technology and Services categories
    // (since those are the categories with Service listings)
    await waitFor(() => {
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.queryByText('Crafts')).not.toBeInTheDocument();
    });
  });
  
  test('shows empty state when no listings match filters', async () => {
    // Mock getUserSavedListings to return empty array
    (databaseFunctions.getUserSavedListings as jest.Mock).mockResolvedValue([]);
    
    render(<SavedListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Check that empty state is displayed
    expect(screen.getByText(/No saved listings found for the selected filter/i)).toBeInTheDocument();
    expect(screen.getByText(/Browse listings and click the bookmark button to save them for later/i)).toBeInTheDocument();
    expect(screen.getByText('Browse Listings')).toBeInTheDocument();
  });
  
  test('shows "View all" link when category has more than 8 listings', async () => {
    // Create more listings for the Technology category
    const manyTechListings = Array(10).fill(null).map((_, i) => ({
      listing: {
        id: `tech${i + 1}`,
        title: `Tech Listing ${i + 1}`,
        description: `Description ${i + 1}`,
        image_url: `/tech${i + 1}.jpg`,
        listing_type: i % 2 === 0 ? 'Service' : 'Product',
        category: 'Technology',
        user_id: `user${i + 2}`
      },
      saved_at: `2024-03-1${i}T12:00:00Z`,
      user_id: 'user1'
    }));
    
    const mixedListings = [
      ...manyTechListings,
      mockSavedListings[1], // Crafts
      mockSavedListings[2]  // Services
    ];
    
    (databaseFunctions.getUserSavedListings as jest.Mock).mockResolvedValue(mixedListings);
    
    render(<SavedListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Check that the "View all" link is displayed for Technology
    expect(screen.getByText(/View all 10 saved listings in Technology/i)).toBeInTheDocument();
    
    // We should not see "View all" for the other categories
    expect(screen.queryByText(/View all .* saved listings in Crafts/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/View all .* saved listings in Services/i)).not.toBeInTheDocument();
  });
  
  test('handles error when fetching listings fails', async () => {
    // Mock getUserSavedListings to throw an error
    (databaseFunctions.getUserSavedListings as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    // Important: We need to create a new mock implementation for the retry action
    const originalMockImplementation = databaseFunctions.getUserSavedListings as jest.Mock;
    const mockedRetryFn = jest.fn().mockResolvedValue([]);
    
    render(<SavedListings />);
    
    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
    
    // Check for try again button
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    
    // Replace the mock implementation before clicking retry
    originalMockImplementation.mockImplementation(mockedRetryFn);
    
    // Click try again button
    fireEvent.click(screen.getByText('Try Again'));
    
    // Verify our retry function was called
    await waitFor(() => {
      expect(mockedRetryFn).toHaveBeenCalledTimes(1);
    });
  });
  
  test('encodes category properly for URLs', async () => {
    render(<SavedListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Verify that encodeCategory was called for each category
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Technology');
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Crafts');
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Services');
  });
  
  test('fetches and displays listing metadata correctly', async () => {
    render(<SavedListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Verify that getUserProfile and getListingRating were called for each listing
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledTimes(3);
    expect(databaseFunctions.getListingRating).toHaveBeenCalledTimes(3);
    
    // Verify that these were called with the correct parameters for each listing's user
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledWith('user2');
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledWith('user3');
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledWith('user4');
    
    // Verify rating calls for each listing
    expect(databaseFunctions.getListingRating).toHaveBeenCalledWith('1');
    expect(databaseFunctions.getListingRating).toHaveBeenCalledWith('2');
    expect(databaseFunctions.getListingRating).toHaveBeenCalledWith('3');
  });
});