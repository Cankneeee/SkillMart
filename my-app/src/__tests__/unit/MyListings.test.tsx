import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyListings from '@/components/MyListings';
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
  getUserListings: jest.fn(),
  getCategories: jest.fn(),
  getListingTypes: jest.fn(),
  encodeCategory: jest.fn(),
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
jest.mock('@/styles/MyListings.module.css', () => ({
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
  createButton: 'createButton',
  createButtonInner: 'createButtonInner',
  createIcon: 'createIcon',
  emptyState: 'emptyState'
}));

describe('MyListings', () => {
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
      user_id: 'user1'
    },
    {
      id: '3',
      title: 'Test Listing 3',
      description: 'Description 3',
      image_url: '/test3.jpg',
      listing_type: 'Service',
      category: 'Services',
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
    (databaseFunctions.getUserListings as jest.Mock).mockResolvedValue(mockListings);
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
    render(<MyListings />);
    
    expect(screen.getByText(/Loading your listings/i)).toBeInTheDocument();
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
    
    render(<MyListings />);
    
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
    render(<MyListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your listings/i)).not.toBeInTheDocument();
    });
    
    // Check that page title is displayed
    expect(screen.getByText('My Listings')).toBeInTheDocument();
    
    // Check that listing count is displayed
    expect(screen.getByText(/\(3 listings\)/i)).toBeInTheDocument();
    
    // Check that category titles are displayed
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Crafts')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    
    // Check that listings are displayed
    expect(screen.getAllByTestId('listing-card').length).toBe(3);
    
    // Check that the create button is displayed
    expect(screen.getByText('Create Listing')).toBeInTheDocument();
  });
  
  test('filters listings when listing type is selected', async () => {
    render(<MyListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your listings/i)).not.toBeInTheDocument();
    });
    
    // Find and click the dropdown toggle
    const dropdownToggle = screen.getByText('All Types');
    fireEvent.click(dropdownToggle);
    
    // Click on a listing type
    const serviceOption = screen.getByText('Service');
    fireEvent.click(serviceOption);
    
    // Since filtering is done client-side, we just need to verify that it updates state
    await waitFor(() => {
      // We expect to see only 2 listings (the ones with type 'Service')
      const categoryTitles = screen.getAllByText(/Technology|Services/i);
      expect(categoryTitles.length).toBeGreaterThan(0);
      
      // We shouldn't see Crafts because that listing is a Product
      expect(screen.queryByText('Crafts')).not.toBeInTheDocument();
    });
  });
  
  test('shows empty state when no listings match filters', async () => {
    // Mock getUserListings to return empty array
    (databaseFunctions.getUserListings as jest.Mock).mockResolvedValue([]);
    
    render(<MyListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your listings/i)).not.toBeInTheDocument();
    });
    
    // Check that empty state is displayed
    expect(screen.getByText(/No listings found for the selected filter/i)).toBeInTheDocument();
    expect(screen.getByText('Create Your First Listing')).toBeInTheDocument();
  });
  
  test('encodes category correctly for URLs', async () => {
    render(<MyListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your listings/i)).not.toBeInTheDocument();
    });
    
    // Verify that encodeCategory was called for each category with listings
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Technology');
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Crafts');
    expect(databaseFunctions.encodeCategory).toHaveBeenCalledWith('Services');
  });
  
  test('fetches and displays listing metadata correctly', async () => {
    render(<MyListings />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading your listings/i)).not.toBeInTheDocument();
    });
    
    // Verify that getUserProfile and getListingRating were called for each listing
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledTimes(3);
    expect(databaseFunctions.getListingRating).toHaveBeenCalledTimes(3);
    
    // Verify that these were called with the correct parameters
    expect(databaseFunctions.getUserProfile).toHaveBeenCalledWith('user1');
    expect(databaseFunctions.getListingRating).toHaveBeenCalledWith('1');
    expect(databaseFunctions.getListingRating).toHaveBeenCalledWith('2');
    expect(databaseFunctions.getListingRating).toHaveBeenCalledWith('3');
  });
});