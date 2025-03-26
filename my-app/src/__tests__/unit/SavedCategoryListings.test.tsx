import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SavedCategoryListings from '@/components/SavedCategoryListings';
import * as databaseFunctions from '@/lib/database';
import { useRouter, useParams, usePathname } from 'next/navigation';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  usePathname: jest.fn()
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
  getListingTypes: jest.fn(),
  getCategories: jest.fn(),
  getCategoryMapping: jest.fn(),
  getUserProfile: jest.fn(),
  getListingRating: jest.fn()
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
jest.mock('@/styles/SavedCategoryListings.module.css', () => ({
  pageContainer: 'pageContainer',
  pageHeader: 'pageHeader',
  titleContainer: 'titleContainer',
  backLink: 'backLink',
  backIcon: 'backIcon',
  pageTitle: 'pageTitle',
  listingCount: 'listingCount',
  headerActions: 'headerActions',
  filterContainer: 'filterContainer',
  filterLabel: 'filterLabel',
  dropdownToggle: 'dropdownToggle',
  dropdownMenu: 'dropdownMenu',
  dropdownItem: 'dropdownItem',
  paginationContainer: 'paginationContainer',
  emptyState: 'emptyState'
}));

describe('SavedCategoryListings', () => {
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
        category: 'Technology',
        user_id: 'user3'
      },
      saved_at: '2024-03-16T11:00:00Z',
      user_id: 'user1'
    }
  ];
  
  const mockCategories = ['Technology', 'Crafts', 'Services'];
  const mockListingTypes = ['All Types', 'Service', 'Product'];
  const mockCategoryMapping = { 'technology': 'Technology' };
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
    (useParams as jest.Mock).mockReturnValue({ category: 'technology' });
    (usePathname as jest.Mock).mockReturnValue('/saved-listings/category/technology');
    
    // Mock supabase
    require('@/utils/supabase/client').createClient.mockReturnValue(mockSupabase);
    
    // Mock database functions
    (databaseFunctions.getUserSavedListings as jest.Mock).mockResolvedValue(mockSavedListings);
    (databaseFunctions.getListingTypes as jest.Mock).mockReturnValue(mockListingTypes);
    (databaseFunctions.getCategories as jest.Mock).mockReturnValue(mockCategories);
    (databaseFunctions.getCategoryMapping as jest.Mock).mockReturnValue(mockCategoryMapping);
    (databaseFunctions.getUserProfile as jest.Mock).mockResolvedValue({
      username: 'Test User',
      profile_picture: '/profile.jpg'
    });
    (databaseFunctions.getListingRating as jest.Mock).mockResolvedValue({ average: 4.5, count: 10 });
  });
  
  test('renders loading state initially', async () => {
    render(<SavedCategoryListings />);
    
    expect(screen.getByText(/Loading your saved listings/i)).toBeInTheDocument();
  });
  
  test('redirects to /saved-listings when category is not found', async () => {
    // Mock getCategoryMapping to return empty mapping
    (databaseFunctions.getCategoryMapping as jest.Mock).mockReturnValue({});
    (databaseFunctions.getCategories as jest.Mock).mockReturnValue([]);
    
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    render(<SavedCategoryListings />);
    
    // Initial loading state
    expect(screen.getByText(/Loading category/i)).toBeInTheDocument();
    
    // Wait for useEffect to run
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/saved-listings');
    });
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
    
    render(<SavedCategoryListings />);
    
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
  
  test('renders listings when data is loaded', async () => {
    render(<SavedCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Check that category title is displayed
    expect(screen.getByText('Technology')).toBeInTheDocument();
    
    // Check that listing count is displayed
    expect(screen.getByText(/\(2 listings\)/i)).toBeInTheDocument();
    
    // Check that listings are displayed
    expect(screen.getAllByTestId('listing-card').length).toBe(2);
    
    // Check that back link is displayed
    expect(screen.getByText('Back to Saved Listings')).toBeInTheDocument();
  });
  
  test('filters listings when listing type is selected', async () => {
    // Mock getUserSavedListings to filter based on the listing type
    (databaseFunctions.getUserSavedListings as jest.Mock).mockImplementation(
      (userId, listingType, category) => {
        if (listingType === 'Service') {
          return Promise.resolve([mockSavedListings[0]]); // Return only the Service listing
        }
        return Promise.resolve(mockSavedListings);
      }
    );
    
    render(<SavedCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Verify initial state shows 2 listings
    expect(screen.getByText(/\(2 listings\)/i)).toBeInTheDocument();
    
    // Find and click the dropdown toggle
    const dropdownToggle = screen.getByText('All Types');
    fireEvent.click(dropdownToggle);
    
    // Click on a listing type
    const serviceOption = screen.getByText('Service');
    fireEvent.click(serviceOption);
    
    // Verify that getUserSavedListings was called with the Service filter
    await waitFor(() => {
      expect(databaseFunctions.getUserSavedListings).toHaveBeenCalledWith(
        mockUserId,
        'Service',
        'Technology'
      );
    });
  });
  
  test('shows empty state when no listings match filters', async () => {
    // Mock getUserSavedListings to return empty array for certain filters
    (databaseFunctions.getUserSavedListings as jest.Mock).mockImplementation(
      (userId, listingType, category) => {
        if (listingType === 'Service') {
          return Promise.resolve([]);
        }
        return Promise.resolve(mockSavedListings);
      }
    );
    
    render(<SavedCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Find and click the dropdown toggle
    const dropdownToggle = screen.getByText('All Types');
    fireEvent.click(dropdownToggle);
    
    // Click on Service filter (which will return empty results)
    const serviceOption = screen.getByText('Service');
    fireEvent.click(serviceOption);
    
    // Wait for the empty state to appear
    await waitFor(() => {
      expect(screen.getByText(/No saved listings found in this category for the selected filter/i)).toBeInTheDocument();
    });
    
    // Check that browse listings button is displayed
    expect(screen.getByText('Browse Listings')).toBeInTheDocument();
  });
  
  test('pagination works correctly when there are multiple pages', async () => {
    // Create more mock listings to test pagination
    const manySavedListings = Array(10).fill(null).map((_, i) => ({
      listing: {
        id: `${i + 1}`,
        title: `Test Listing ${i + 1}`,
        description: `Description ${i + 1}`,
        image_url: `/test${i + 1}.jpg`,
        listing_type: i % 2 === 0 ? 'Service' : 'Product',
        category: 'Technology',
        user_id: `user${i + 2}`
      },
      saved_at: `2024-03-1${i}T12:00:00Z`,
      user_id: 'user1'
    }));
    
    (databaseFunctions.getUserSavedListings as jest.Mock).mockResolvedValue(manySavedListings);
    
    render(<SavedCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // With itemsPerPage set to 8, we should have 2 pages
    // Find the pagination items
    const pageNumbers = screen.getAllByText(/^[1-2]$/);
    expect(pageNumbers.length).toBeGreaterThan(0);
    
    // Find the page 2 link specifically
    const page2 = screen.getByText('2');
    expect(page2).toBeInTheDocument();
    
    // Click on page 2
    fireEvent.click(page2);
    
    // After clicking page 2, verify we're still on the page
    await waitFor(() => {
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });
  });
  
  test('fetches listings with correct parameters', async () => {
    render(<SavedCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Verify getUserSavedListings was called with the correct parameters
    expect(databaseFunctions.getUserSavedListings).toHaveBeenCalledWith(
      mockUserId,
      undefined, // No listing type filter initially
      'Technology' // The category name
    );
    
    // Now apply a filter
    const dropdownToggle = screen.getByText('All Types');
    fireEvent.click(dropdownToggle);
    
    // Click on a listing type
    const serviceOption = screen.getByText('Service');
    fireEvent.click(serviceOption);
    
    // Verify the function was called again with the filter
    await waitFor(() => {
      expect(databaseFunctions.getUserSavedListings).toHaveBeenCalledWith(
        mockUserId,
        'Service', // Now with listing type filter
        'Technology'
      );
    });
  });
  
  test('handles error when fetching listings fails', async () => {
    // Mock getUserSavedListings to throw an error
    (databaseFunctions.getUserSavedListings as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    // Important: We need to create a new mock implementation for the retry action
    const originalMockImplementation = databaseFunctions.getUserSavedListings as jest.Mock;
    const mockedRetryFn = jest.fn().mockResolvedValue([]);
    
    render(<SavedCategoryListings />);
    
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
  
  test('fetches and displays listing metadata correctly', async () => {
    render(<SavedCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your saved listings/i)).not.toBeInTheDocument();
    });
    
    // Verify that getUserProfile and getListingRating were called for each listing
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledTimes(2);
    expect(databaseFunctions.getListingRating).toHaveBeenCalledTimes(2);
    
    // Verify that these were called with the correct parameters
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledWith('user2');
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledWith('user3');
    expect(databaseFunctions.getListingRating).toHaveBeenCalledWith('1');
    expect(databaseFunctions.getListingRating).toHaveBeenCalledWith('2');
  });
});