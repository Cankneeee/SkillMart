import { render } from '@testing-library/react';
import ImageSkeleton from '@/components/ImageSkeleton';

// Mock CSS modules
jest.mock('@/styles/ImageSkeleton.module.css', () => ({
  skeleton: 'mock-skeleton',
  shimmer: 'mock-shimmer',
}));

describe('ImageSkeleton', () => {
  test('renders with default classes', () => {
    const { container } = render(<ImageSkeleton />);
    
    // Find the div element directly from the container
    const skeletonDiv = container.firstChild as HTMLElement;
    
    // Verify it has the correct classes
    expect(skeletonDiv).toHaveClass('mock-skeleton');
    expect(skeletonDiv).toHaveClass('mock-shimmer');
  });

  test('applies additional className when provided', () => {
    const customClass = 'custom-class';
    const { container } = render(<ImageSkeleton className={customClass} />);
    
    // Find the div element directly from the container
    const skeletonDiv = container.firstChild as HTMLElement;
    
    // Verify it has all expected classes
    expect(skeletonDiv).toHaveClass('mock-skeleton');
    expect(skeletonDiv).toHaveClass('mock-shimmer');
    expect(skeletonDiv).toHaveClass(customClass);
  });
});