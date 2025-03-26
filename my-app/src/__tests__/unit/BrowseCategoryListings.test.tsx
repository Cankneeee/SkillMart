import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BrowseCategoryListings from '@/components/BrowseCategoryListings';
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
  getListings: jest.fn(),
  getListingTypes: jest.fn(),
  getCategories: jest.fn(),
  getCategoryMapping: jest.fn(),
  decodeCategoryFromSlug: jest.fn(),
  getListingRating: jest.fn(),
  getUserProfile: jest.fn()
}));

// Mock the supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({ from: jest.fn() }))
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
jest.mock('@/styles/BrowseCategoryListings.module.css', () => ({
  pageContainer: 'pageContainer',
  pageHeader: 'pageHeader',
  titleContainer: 'titleContainer',
  backLink: 'backLink',
  backIcon: 'backIcon',
  pageTitle: 'pageTitle',
  listingCount: 'listingCount',
  headerActions: 'headerActions',
  searchForm: 'searchForm',
  searchInput: 'searchInput',
  searchButton: 'searchButton',
  filterContainer: 'filterContainer',
  filterLabel: 'filterLabel',
  dropdownToggle: 'dropdownToggle',
  dropdownMenu: 'dropdownMenu',
  dropdownItem: 'dropdownItem',
  paginationContainer: 'paginationContainer',
  emptyState: 'emptyState',
  emptyStateSubtext: 'emptyStateSubtext',
  emptyStateActions: 'emptyStateActions',
  clearSearchButton: 'clearSearchButton',
  resetFilterButton: 'resetFilterButton'
}));

describe('BrowseCategoryListings', () => {
  // Common test data
  const mockListings = [
    {
      id: '1',
      title: 'Test Listing 1',
      description: 'Description 1',
      image_url: '/test1.jpg',
      listing_type: 'Service',
      category: 'Technology',
      user_id: 'user1'
    },
    {
      id: '2',
      title: 'Test Listing 2',
      description: 'Description 2',
      image_url: '/test2.jpg',
      listing_type: 'Product',
      category: 'Technology',
      user_id: 'user2'
    }
  ];
  
  const mockCategories = ['Technology', 'Crafts', 'Services'];
  const mockListingTypes = ['All Types', 'Service', 'Product'];
  const mockCategoryMapping = { 'technology': 'Technology' };
  
  // Set up mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock router functions
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn()
    });
    (useParams as jest.Mock).mockReturnValue({ category: 'technology' });
    (usePathname as jest.Mock).mockReturnValue('/browse/category/technology');
    
    // Mock database functions
    (databaseFunctions.getListings as jest.Mock).mockResolvedValue(mockListings);
    (databaseFunctions.getListingTypes as jest.Mock).mockReturnValue(mockListingTypes);
    (databaseFunctions.getCategories as jest.Mock).mockReturnValue(mockCategories);
    (databaseFunctions.getCategoryMapping as jest.Mock).mockReturnValue(mockCategoryMapping);
    (databaseFunctions.getListingRating as jest.Mock).mockResolvedValue({ average: 4.5, count: 10 });
    (databaseFunctions.getUserProfile as jest.Mock).mockResolvedValue({
      username: 'Test User',
      profile_picture: '/profile.jpg'
    });
  });
  
  test('renders loading state initially', async () => {
    render(<BrowseCategoryListings />);
    
    expect(screen.getByText(/Loading listings for Technology/i)).toBeInTheDocument();
  });
  
  test('redirects to /browse when category is not found', async () => {
    // Mock getCategoryMapping to return empty mapping
    (databaseFunctions.getCategoryMapping as jest.Mock).mockReturnValue({});
    (databaseFunctions.getCategories as jest.Mock).mockReturnValue([]);
    
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    render(<BrowseCategoryListings />);
    
    // Initial loading state
    expect(screen.getByText(/Loading category/i)).toBeInTheDocument();
    
    // Wait for useEffect to run
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/browse');
    });
  });
  
  test('renders listings when data is loaded', async () => {
    render(<BrowseCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
    
    // Check that category title is displayed
    expect(screen.getByText('Technology')).toBeInTheDocument();
    
    // Check that listing count is displayed
    expect(screen.getByText(/\(2 listings\)/i)).toBeInTheDocument();
    
    // Check that listings are displayed
    expect(screen.getAllByTestId('listing-card').length).toBe(2);
  });
  
  test('filters listings when search query changes', async () => {
    render(<BrowseCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
    
    // Find the search input and type in it
    const searchInput = screen.getByPlaceholderText(/Search in Technology/i);
    fireEvent.change(searchInput, { target: { value: 'Test Listing 1' } });
    
    // Wait for filtered results
    await waitFor(() => {
      expect(screen.getAllByTestId('listing-card').length).toBe(1);
    });
  });
  
  test('filters listings when listing type is selected', async () => {
    render(<BrowseCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
    
    // Find and click the dropdown toggle
    const dropdownToggle = screen.getByText('All Types');
    fireEvent.click(dropdownToggle);
    
    // Click on a listing type
    const serviceOption = screen.getByText('Service');
    fireEvent.click(serviceOption);
    
    // Verify that getListings was called with the selected listing type
    await waitFor(() => {
      expect(databaseFunctions.getListings).toHaveBeenCalledWith(
        'Service', 
        'Technology'
      );
    });
  });
  
  test('shows empty state when no listings match filters', async () => {
    // Mock getListings to return empty array for certain filters
    (databaseFunctions.getListings as jest.Mock).mockImplementation((listingType, category) => {
      if (listingType === 'Service') {
        return Promise.resolve([]);
      }
      return Promise.resolve(mockListings);
    });
    
    render(<BrowseCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
    
    // Find and click the dropdown toggle
    const dropdownToggle = screen.getByText('All Types');
    fireEvent.click(dropdownToggle);
    
    // Click on a listing type
    const serviceOption = screen.getByText('Service');
    fireEvent.click(serviceOption);
    
    // Wait for the empty state to appear
    await waitFor(() => {
      expect(screen.getByText(/No listings found in this category for the selected criteria/i)).toBeInTheDocument();
    });
    
    // Check that reset button is displayed
    expect(screen.getByText('Reset Filter')).toBeInTheDocument();
  });
  
  test('handles error when fetching listings fails', async () => {
    // Mock getListings to throw an error
    (databaseFunctions.getListings as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    render(<BrowseCategoryListings />);
    
    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
    
    // Check for try again button
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    
    // Click try again button
    fireEvent.click(screen.getByText('Try Again'));
    
    // Verify getListings was called again
    expect(databaseFunctions.getListings).toHaveBeenCalledTimes(2);
  });
  
  test('pagination works correctly when there are multiple pages', async () => {
    // Create more mock listings to test pagination
    const manyListings = Array(10).fill(null).map((_, i) => ({
      id: `${i + 1}`,
      title: `Test Listing ${i + 1}`,
      description: `Description ${i + 1}`,
      image_url: `/test${i + 1}.jpg`,
      listing_type: i % 2 === 0 ? 'Service' : 'Product',
      category: 'Technology',
      user_id: `user${i + 1}`
    }));
    
    (databaseFunctions.getListings as jest.Mock).mockResolvedValue(manyListings);
    
    render(<BrowseCategoryListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
    
    // With itemsPerPage set to 8, we should have 2 pages
    // Find the pagination items by text content
    const pageNumbers = screen.getAllByText(/^[1-2]$/);
    expect(pageNumbers.length).toBeGreaterThan(0);
    
    // Find the page 2 link specifically
    const page2 = screen.getByText('2');
    expect(page2).toBeInTheDocument();
    
    // Click on page 2
    fireEvent.click(page2);
    
    // After clicking page 2, verify we're still on the page
    // and the component didn't crash
    await waitFor(() => {
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });
  });
});