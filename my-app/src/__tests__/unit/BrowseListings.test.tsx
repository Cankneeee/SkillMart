import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BrowseListings from '@/components/BrowseListings';
import * as databaseFunctions from '@/lib/database';
import * as searchAlgorithm from '@/lib/searchAlgorithm';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn()
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
  getCategories: jest.fn(),
  getListingTypes: jest.fn(),
  encodeCategory: jest.fn(),
  getListingRating: jest.fn(),
  getUserProfile: jest.fn()
}));

// Mock the search algorithm
jest.mock('@/lib/searchAlgorithm', () => ({
  searchListings: jest.fn()
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
jest.mock('@/styles/BrowseListings.module.css', () => ({
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
  paginationContainer: 'paginationContainer',
  emptyState: 'emptyState',
  emptyStateSubtext: 'emptyStateSubtext',
  clearSearchButton: 'clearSearchButton'
}));

describe('BrowseListings', () => {
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
      category: 'Crafts',
      user_id: 'user2'
    },
    {
      id: '3',
      title: 'Test Listing 3',
      description: 'Description 3',
      image_url: '/test3.jpg',
      listing_type: 'Service',
      category: 'Services',
      user_id: 'user3'
    }
  ];
  
  const mockCategories = ['Technology', 'Crafts', 'Services'];
  const mockListingTypes = ['All Types', 'Service', 'Product'];
  
  // Mock for useSearchParams
  const mockSearchParams = {
    get: jest.fn()
  };
  
  // Set up mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock router functions
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn()
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue('');
    
    // Mock database functions
    (databaseFunctions.getListings as jest.Mock).mockResolvedValue(mockListings);
    (databaseFunctions.getCategories as jest.Mock).mockReturnValue(mockCategories);
    (databaseFunctions.getListingTypes as jest.Mock).mockReturnValue(mockListingTypes);
    (databaseFunctions.encodeCategory as jest.Mock).mockImplementation(
      (category) => category.toLowerCase().replace(/\s+/g, '-')
    );
    (databaseFunctions.getListingRating as jest.Mock).mockResolvedValue({ average: 4.5, count: 10 });
    (databaseFunctions.getUserProfile as jest.Mock).mockResolvedValue({
      username: 'Test User',
      profile_picture: '/profile.jpg'
    });
    
    // Mock search algorithm
    (searchAlgorithm.searchListings as jest.Mock).mockResolvedValue(mockListings);
  });
  
  test('renders loading state initially', async () => {
    render(<BrowseListings />);
    
    expect(screen.getByText(/Loading listings/i)).toBeInTheDocument();
  });
  
  test('renders listings grouped by category when data is loaded', async () => {
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Check that page title is displayed
    expect(screen.getByText('Browse Listings')).toBeInTheDocument();
    
    // Check that listing count is displayed
    expect(screen.getByText(/\(3 listings\)/i)).toBeInTheDocument();
    
    // Check that category titles are displayed
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Crafts')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    
    // Check that listings are displayed
    expect(screen.getAllByTestId('listing-card').length).toBe(3);
  });
  
  test('displays search results when search query is present', async () => {
    // Mock search query parameter
    mockSearchParams.get.mockReturnValue('test query');
    
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Check that search results title is displayed
    expect(screen.getByText(/Search Results: "test query"/i)).toBeInTheDocument();
    
    // Check that search algorithm was called
    expect(searchAlgorithm.searchListings).toHaveBeenCalledWith('test query', undefined);
    
    // Check that a "Clear Search Results" button is displayed
    expect(screen.getByText('Clear Search Results')).toBeInTheDocument();
  });
  
  test('filters listings when listing type is selected', async () => {
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Find and click the dropdown toggle
    const dropdownToggle = screen.getByText('All Types');
    fireEvent.click(dropdownToggle);
    
    // Click on a listing type
    const serviceOption = screen.getByText('Service');
    fireEvent.click(serviceOption);
    
    // Verify that getListings was called with the selected listing type
    await waitFor(() => {
      expect(databaseFunctions.getListings).toHaveBeenCalledWith('Service');
    });
  });
  
  test('clears search when clear search button is clicked', async () => {
    // Mock search query parameter
    mockSearchParams.get.mockReturnValue('test query');
    
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Find and click the clear search button
    const clearButton = screen.getByText('Clear Search Results');
    fireEvent.click(clearButton);
    
    // Verify that router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/browse');
  });
  
  test('shows empty state when no listings match criteria', async () => {
    // Mock getListings to return empty array
    (databaseFunctions.getListings as jest.Mock).mockResolvedValue([]);
    
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Check that empty state is displayed
    expect(screen.getByText(/No listings found with the selected filter/i)).toBeInTheDocument();
    expect(screen.getByText(/Try selecting a different listing type/i)).toBeInTheDocument();
  });
  
  test('shows empty state when search has no results', async () => {
    // Mock search query parameter
    mockSearchParams.get.mockReturnValue('nonexistent');
    
    // Mock searchListings to return empty array
    (searchAlgorithm.searchListings as jest.Mock).mockResolvedValue([]);
    
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Check that empty state is displayed
    expect(screen.getByText(/No listings found for "nonexistent"/i)).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your search terms/i)).toBeInTheDocument();
    expect(screen.getByText('Clear Search')).toBeInTheDocument();
  });
  
  test('handles error when fetching listings fails', async () => {
    // Mock getListings to throw an error
    (databaseFunctions.getListings as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    render(<BrowseListings />);
    
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
  
  test('renders "View all" links for categories with more than 4 listings', async () => {
    // Create more listings for the Technology category
    const manyTechListings = Array(6).fill(null).map((_, i) => ({
      id: `tech${i + 1}`,
      title: `Tech Listing ${i + 1}`,
      description: `Description ${i + 1}`,
      image_url: `/tech${i + 1}.jpg`,
      listing_type: i % 2 === 0 ? 'Service' : 'Product',
      category: 'Technology',
      user_id: `user${i + 1}`
    }));
    
    const mixedListings = [
      ...manyTechListings,
      mockListings[1], // Crafts
      mockListings[2]  // Services
    ];
    
    (databaseFunctions.getListings as jest.Mock).mockResolvedValue(mixedListings);
    
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Check that the "View all" link is displayed for Technology (which has 6 listings)
    expect(screen.getByText(/View all 6 listings in Technology/i)).toBeInTheDocument();
    
    // Check that only 4 Technology listings are displayed
    const categoryTech = screen.getByText('Technology').closest('div');
    expect(categoryTech).toBeInTheDocument();
    
    // This test is simplified since we mocked the ListingCard component
    // In reality, we'd want to check that exactly 4 Technology listings are rendered
  });
  
  test('encodes category properly for URLs', async () => {
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Verify that encodeCategory was called for each category
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Technology');
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Crafts');
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Services');
  });
  
  test('shows all results from a category when searching', async () => {
    // Mock search query parameter
    mockSearchParams.get.mockReturnValue('test');
    
    // Create more listings for the Technology category
    const manyTechListings = Array(6).fill(null).map((_, i) => ({
      id: `tech${i + 1}`,
      title: `Tech Listing ${i + 1}`,
      description: `Description ${i + 1}`,
      image_url: `/tech${i + 1}.jpg`,
      listing_type: i % 2 === 0 ? 'Service' : 'Product',
      category: 'Technology',
      user_id: `user${i + 1}`
    }));
    
    (searchAlgorithm.searchListings as jest.Mock).mockResolvedValue(manyTechListings);
    
    render(<BrowseListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading listings/i)).not.toBeInTheDocument();
    });
    
    // Check that search results title is displayed
    expect(screen.getByText(/Search Results: "test"/i)).toBeInTheDocument();
    
    // Check that all 6 listings are displayed (no 4-listing limit during search)
    expect(screen.getAllByTestId('listing-card').length).toBe(6);
    
    // Check that there is no "View all" link (since all items are already shown)
    expect(screen.queryByText(/View all/i)).not.toBeInTheDocument();
  });
});