import { render } from '@testing-library/react';
import ListingCardSkeleton from '@/components/ListingCardSkeleton';

// Mock CSS modules
jest.mock('@/styles/ListingCard.module.css', () => ({
  card: 'mock-card',
  imageContainer: 'mock-image-container',
  shimmer: 'mock-shimmer',
  skeletonImage: 'mock-skeleton-image',
  typeBadge: 'mock-type-badge',
  skeletonTypeBadge: 'mock-skeleton-type-badge',
  cardBody: 'mock-card-body',
  categoryTag: 'mock-category-tag',
  skeletonCategoryTag: 'mock-skeleton-category-tag',
  cardTitle: 'mock-card-title',
  skeletonTitle: 'mock-skeleton-title',
  authorContainer: 'mock-author-container',
  authorImageWrapper: 'mock-author-image-wrapper',
  skeletonAuthorImage: 'mock-skeleton-author-image',
  authorName: 'mock-author-name',
  skeletonAuthorName: 'mock-skeleton-author-name',
  ratingContainer: 'mock-rating-container',
  stars: 'mock-stars',
  skeletonStars: 'mock-skeleton-stars',
}));

describe('ListingCardSkeleton', () => {
  test('renders the skeleton structure correctly', () => {
    const { container } = render(<ListingCardSkeleton />);
    
    // Check that the main card container is rendered
    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass('mock-card');
    
    // Check for the image skeleton
    const imageContainer = container.querySelector('.mock-image-container');
    expect(imageContainer).toHaveClass('mock-shimmer');
    
    // Check for the skeleton image placeholder
    expect(container.querySelector('.mock-skeleton-image')).toBeInTheDocument();
    
    // Check for skeleton category tag
    expect(container.querySelector('.mock-skeleton-category-tag')).toBeInTheDocument();
    
    // Check for skeleton title
    expect(container.querySelector('.mock-skeleton-title')).toBeInTheDocument();
    
    // Check for author skeleton parts
    expect(container.querySelector('.mock-skeleton-author-image')).toBeInTheDocument();
    expect(container.querySelector('.mock-skeleton-author-name')).toBeInTheDocument();
    
    // Check for rating skeleton
    expect(container.querySelector('.mock-skeleton-stars')).toBeInTheDocument();
  });
});