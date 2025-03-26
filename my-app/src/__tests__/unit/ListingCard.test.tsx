import { render, screen, fireEvent } from '@testing-library/react';
import ListingCard from '@/components/ListingCard';

// Mock the constants before mocking the module
const MOCK_DEFAULT_LISTING_IMAGE = '/default-listing.jpg';
const MOCK_DEFAULT_PROFILE_IMAGE = '/default-profile.jpg';

// Mock the Next.js Link and Image components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="next-link">{children}</a>
  );
});

jest.mock('next/image', () => {
  return ({ src, alt, className, width, height, onError }: { 
    src: string; 
    alt: string; 
    className?: string; 
    width: number; 
    height: number;
    onError: (e: any) => void;
  }) => (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      width={width} 
      height={height} 
      data-testid="next-image" 
      onError={onError}
    />
  );
});

// Mock react-icons components
jest.mock('react-icons/fa', () => ({
  FaUser: () => <div data-testid="fa-user" />,
  FaStar: () => <div data-testid="fa-star" />,
  FaRegStar: () => <div data-testid="fa-reg-star" />,
}));

// Mock ImageSkeleton component
jest.mock('@/components/ImageSkeleton', () => {
  return ({ className }: { className?: string }) => (
    <div data-testid="image-skeleton" className={className} />
  );
});

// Mock CSS modules
jest.mock('@/styles/ListingCard.module.css', () => ({
  cardLink: 'mock-card-link',
  card: 'mock-card',
  imageContainer: 'mock-image-container',
  cardImage: 'mock-card-image',
  typeBadge: 'mock-type-badge',
  cardBody: 'mock-card-body',
  categoryTag: 'mock-category-tag',
  cardTitle: 'mock-card-title',
  authorContainer: 'mock-author-container',
  authorImageWrapper: 'mock-author-image-wrapper',
  authorImage: 'mock-author-image',
  defaultAuthorIcon: 'mock-default-author-icon',
  authorName: 'mock-author-name',
  ratingContainer: 'mock-rating-container',
  stars: 'mock-stars',
  star: 'mock-star',
  rating: 'mock-rating',
  reviewCount: 'mock-review-count',
}));

// Mock the image utils
jest.mock('@/utils/imageUtils', () => ({
  DEFAULT_LISTING_IMAGE: '/default-listing.jpg',
  DEFAULT_PROFILE_IMAGE: '/default-profile.jpg',
}));

// Sample listing data for tests
const mockListingData = {
  id: 'listing123',
  title: 'Test Listing',
  image: 'https://example.com/image.jpg',
  listingType: 'Service',
  category: 'Programming',
  user_id: 'user123',
  authorName: 'John Doe',
  authorProfilePic: 'https://example.com/profile.jpg',
  rating: 4.5,
  reviewCount: 10,
};

describe('ListingCard', () => {
  test('renders with all provided props', () => {
    render(<ListingCard {...mockListingData} />);
    
    // Check if the link points to the correct listing
    const linkElement = screen.getByTestId('next-link');
    expect(linkElement).toHaveAttribute('href', `/listing/${mockListingData.id}`);
    
    // Check if title is displayed
    expect(screen.getByText(mockListingData.title)).toBeInTheDocument();
    
    // Check if category is displayed
    expect(screen.getByText(mockListingData.category)).toBeInTheDocument();
    
    // Check if listing type badge is displayed
    expect(screen.getByText(mockListingData.listingType)).toBeInTheDocument();
    
    // Check if author name is displayed
    expect(screen.getByText(mockListingData.authorName)).toBeInTheDocument();
    
    // Check if rating is displayed (using a more flexible approach)
    expect(screen.getByText((content) => {
      return content.includes('4.5');
    })).toBeInTheDocument();
    
    // Check if review count is displayed (using a more flexible approach)
    expect(screen.getByText((content) => {
      return content.includes(`(${mockListingData.reviewCount})`);
    })).toBeInTheDocument();
    
    // Check if images are rendered with Next.js Image component
    const images = screen.getAllByTestId('next-image');
    expect(images.length).toBeGreaterThan(0);
  });
  
  test('renders with default images when image props are not provided', () => {
    const listingWithoutImages = {
      ...mockListingData,
      image: '',
      authorProfilePic: undefined,
    };
    
    render(<ListingCard {...listingWithoutImages} />);
    
    // Check if default user icon is shown instead of profile pic
    expect(screen.getByTestId('fa-user')).toBeInTheDocument();
  });
  
  test('renders correct number of stars based on rating', () => {
    // Test with a lower rating first
    const lowRatingListing = {
      ...mockListingData,
      rating: 2.0, // Set to exact 2.0 to avoid rounding issues
    };
    
    // Completely fresh render - don't use rerender which might cause test issues
    const { unmount } = render(<ListingCard {...lowRatingListing} />);
    
    // For rating 2.0, we expect 2 full stars and 3 empty stars
    expect(screen.getAllByTestId('fa-star').length).toBe(2);
    expect(screen.getAllByTestId('fa-reg-star').length).toBe(3);
    
    // Unmount the first component
    unmount();
    
    // Now test with a higher rating in a completely fresh render
    const highRatingListing = {
      ...mockListingData,
      rating: 4.0, // Set to exact 4.0 to avoid rounding issues
    };
    
    // New render
    render(<ListingCard {...highRatingListing} />);
    
    // For rating 4.0, we expect 4 full stars and 1 empty star
    expect(screen.getAllByTestId('fa-star').length).toBe(4);
    expect(screen.getAllByTestId('fa-reg-star').length).toBe(1);
  });
});