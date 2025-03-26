import { render, screen, waitFor } from '@testing-library/react';
import Listing from '@/components/Listing';
import { listingApi, userApi, savedListingApi } from '@/lib/api';
import { getUser } from '@/utils/auth';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock next/image - simplified
jest.mock('next/image', () => {
  return function MockImage(props: any) {
    return <img data-testid="next-image" alt={props.alt} src={props.src} />;
  };
});

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaUser: () => <div data-testid="fa-user-icon" />,
  FaPen: () => <div data-testid="fa-pen-icon" />,
  FaTrash: () => <div data-testid="fa-trash-icon" />,
  FaCheck: () => <div data-testid="fa-check-icon" />,
  FaTimes: () => <div data-testid="fa-times-icon" />,
  FaBookmark: () => <div data-testid="fa-bookmark-icon" />,
  FaStar: () => <div data-testid="fa-star-icon" />,
  FaRegStar: () => <div data-testid="fa-reg-star-icon" />,
}));

// Mock the APIs with explicit Promise resolution
jest.mock('@/lib/api', () => ({
  listingApi: {
    getListingById: jest.fn(() => Promise.resolve({
      data: {
        id: 'listing123',
        title: 'Test Listing',
        description: 'This is a test listing',
        listing_type: 'Providing Skills',
        category: 'Business',
        price: 100,
        image_url: 'https://example.com/image.jpg',
        user_id: 'user123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      error: null,
    })),
    updateListing: jest.fn(),
    deleteListing: jest.fn(),
  },
  userApi: {
    getProfile: jest.fn(() => Promise.resolve({
      data: {
        id: 'user123',
        username: 'Test User',
        profile_picture: 'https://example.com/profile.jpg',
        email: 'test@example.com',
      },
      error: null,
    })),
  },
  savedListingApi: {
    isListingSaved: jest.fn(() => Promise.resolve({
      data: false,
      error: null,
    })),
    saveListing: jest.fn(),
    unsaveListing: jest.fn(),
  },
}));

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
    },
  })),
}));

// Mock the auth utilities
jest.mock('@/utils/auth', () => ({
  getUser: jest.fn(() => Promise.resolve({ id: 'user123' })),
}));

// Mock the image utils - simplified
jest.mock('@/utils/imageUtils', () => ({
  DEFAULT_LISTING_IMAGE: '/default-listing.jpg',
  DEFAULT_PROFILE_IMAGE: '/default-profile.jpg',
  useImageWithFallback: jest.fn(() => ({
    imgSrc: 'https://example.com/image.jpg',
    onError: jest.fn(),
  })),
  uploadListingPicture: jest.fn(),
}));

// Mock the database utilities
jest.mock('@/lib/database', () => ({
  getCategories: jest.fn(() => ['Business', 'IT', 'Design']),
  getListingTypes: jest.fn(() => ['All Types', 'Providing Skills', 'Looking for Skills', 'Trading Skills']),
}));

// Mock the ReviewsSection component
jest.mock('@/components/ReviewsSection', () => {
  return function MockReviewsSection({ listingId, userId }: { listingId: string; userId: string | null }) {
    return <div data-testid="reviews-section">Reviews Section</div>;
  };
});

// Mock the ImageSkeleton component
jest.mock('@/components/ImageSkeleton', () => {
  return function MockImageSkeleton({ className }: { className?: string }) {
    return <div data-testid="image-skeleton" className={className}>Image Skeleton</div>;
  };
});

// Mock CSS modules
jest.mock('@/styles/Listing.module.css', () => ({
  pageContainer: 'mock-page-container',
  listingHeader: 'mock-listing-header',
  titleRow: 'mock-title-row',
  title: 'mock-title',
  titleInput: 'mock-title-input',
  actionButtons: 'mock-action-buttons',
  actionButton: 'mock-action-button',
  byInfo: 'mock-by-info',
  authorImageWrapper: 'mock-author-image-wrapper',
  authorImage: 'mock-author-image',
  byIcon: 'mock-by-icon',
  byText: 'mock-by-text',
  imageWrapper: 'mock-image-wrapper',
  listingImage: 'mock-listing-image',
  listingImageContain: 'mock-listing-image-contain',
  listingImageCover: 'mock-listing-image-cover',
  editImageButton: 'mock-edit-image-button',
  removeImageButton: 'mock-remove-image-button',
  editField: 'mock-edit-field',
  sortSelect: 'mock-sort-select',
  dropdownMenu: 'mock-dropdown-menu',
  dropdownItem: 'mock-dropdown-item',
}));

// Mock ConfirmationModal component
jest.mock('@/components/ConfirmationModal', () => {
  return function MockConfirmationModal({ show, title, message, onCancel, onConfirm }: any) {
    return show ? (
      <div data-testid="confirmation-modal">
        <div>{title}</div>
        <div>{message}</div>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null;
  };
});

describe('Listing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks to their default implementations for each test
    (listingApi.getListingById as jest.Mock).mockImplementation(() => Promise.resolve({
      data: {
        id: 'listing123',
        title: 'Test Listing',
        description: 'This is a test listing',
        listing_type: 'Providing Skills',
        category: 'Business',
        price: 100,
        image_url: 'https://example.com/image.jpg',
        user_id: 'user123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      error: null,
    }));
    
    (userApi.getProfile as jest.Mock).mockImplementation(() => Promise.resolve({
      data: {
        id: 'user123',
        username: 'Test User',
        profile_picture: 'https://example.com/profile.jpg',
        email: 'test@example.com',
      },
      error: null,
    }));
    
    (savedListingApi.isListingSaved as jest.Mock).mockImplementation(() => Promise.resolve({
      data: false,
      error: null,
    }));
    
    (getUser as jest.Mock).mockImplementation(() => Promise.resolve({ id: 'user123' }));
  });

  test('displays loading state initially', () => {
    render(<Listing listingId="listing123" />);
    expect(screen.getByText('Loading listing...')).toBeInTheDocument();
  });

  test('fetches listing data from API on mount', async () => {
    render(<Listing listingId="listing123" />);
    
    // Wait for API to be called
    await waitFor(() => {
      expect(listingApi.getListingById).toHaveBeenCalledWith('listing123');
    });
  });

  test('displays error message when listing fetch fails', async () => {
    // Mock API error
    (listingApi.getListingById as jest.Mock).mockImplementation(() => Promise.resolve({
      data: null,
      error: 'Failed to fetch listing',
    }));
    
    render(<Listing listingId="listing123" />);
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Error loading listing/)).toBeInTheDocument();
    });
  });

  // Use findByText for async behavior
  test('displays listing details when data is loaded successfully', async () => {
    render(<Listing listingId="listing123" />);
    
    // Use findByText which has built-in waitFor functionality
    const titleElement = await screen.findByText('Test Listing');
    expect(titleElement).toBeInTheDocument();
    
    const descriptionElement = await screen.findByText('This is a test listing');
    expect(descriptionElement).toBeInTheDocument();
  });

  test('fetches owner profile data', async () => {
    render(<Listing listingId="listing123" />);
    
    // Wait for owner info to appear
    const ownerElement = await screen.findByText(/By Test User/);
    expect(ownerElement).toBeInTheDocument();
    
    expect(userApi.getProfile).toHaveBeenCalledWith('user123');
  });

  test('checks if listing is saved by the current user', async () => {
    render(<Listing listingId="listing123" />);
    
    // Wait for component to load
    await screen.findByText('Test Listing');
    
    // Verify API call was made
    expect(savedListingApi.isListingSaved).toHaveBeenCalledWith('user123', 'listing123');
  });

  test('shows edit/delete buttons for owner', async () => {
    // Explicitly set user as owner
    (getUser as jest.Mock).mockImplementation(() => Promise.resolve({ id: 'user123' })); // Same as listing.user_id
    
    render(<Listing listingId="listing123" />);
    
    // Wait for listing to load
    await screen.findByText('Test Listing');
    
    // Check for edit/delete buttons (using data-testid)
    // These will be available based on how our mocks are set up
    const editIcon = await screen.findByTestId('fa-pen-icon');
    const deleteIcon = await screen.findByTestId('fa-trash-icon');
    
    expect(editIcon).toBeInTheDocument();
    expect(deleteIcon).toBeInTheDocument();
  });

  test('does not show edit/delete buttons for non-owner', async () => {
    // Set user as non-owner
    (getUser as jest.Mock).mockImplementation(() => Promise.resolve({ id: 'different-user' }));
    
    render(<Listing listingId="listing123" />);
    
    // Wait for listing to load
    await screen.findByText('Test Listing');
    
    // Edit/delete buttons should not be present
    await waitFor(() => {
      expect(screen.queryByTestId('fa-pen-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fa-trash-icon')).not.toBeInTheDocument();
    });
  });

  test('renders ReviewsSection component', async () => {
    render(<Listing listingId="listing123" />);
    
    // Wait for the component to load completely
    await screen.findByText('Test Listing');
    
    // Now the reviews section should be rendered
    const reviewsSection = await screen.findByTestId('reviews-section');
    expect(reviewsSection).toBeInTheDocument();
  });
});