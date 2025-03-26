import { render, screen, fireEvent } from '@testing-library/react';
import CategoriesTab from '@/components/CategoriesTab';

/**
 * Mock dependencies
 * 
 * We only need to mock the Next.js Link component for this simpler component.
 * This allows us to test the href attributes and click behavior without
 * actual navigation.
 */
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock CSS modules
jest.mock('@/styles/CategoriesTab.module.css', () => ({
  offcanvas: 'mock-offcanvas-class',
  offcanvasTitle: 'mock-offcanvas-title-class',
  offcanvasNav: 'mock-offcanvas-nav-class',
  offcanvasLink: 'mock-offcanvas-link-class',
}));

describe('CategoriesTab', () => {
  // Create a mock function to track onClose calls
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    // Clear all mock function calls between tests
    jest.clearAllMocks();
  });

  /**
   * Conditional rendering tests
   * These verify the component renders correctly based on props
   */
  
  test('renders when show is true', () => {
    // Render with show=true to make the component visible
    render(<CategoriesTab show={true} onClose={mockOnClose} />);
    
    // Verify the title is visible when shown
    expect(screen.getByText('Explore Categories')).toBeInTheDocument();
  });

  test('does not render when show is false', () => {
    // Render with show=false to hide the component
    render(<CategoriesTab show={false} onClose={mockOnClose} />);
    
    // Verify the title is not visible when hidden
    // Using queryByText instead of getByText as it doesn't throw when element is missing
    expect(screen.queryByText('Explore Categories')).not.toBeInTheDocument();
  });

  /**
   * Content tests
   * These verify the component renders the correct content
   */
  
  test('renders all category links', () => {
    render(<CategoriesTab show={true} onClose={mockOnClose} />);
    
    // List of all categories that should be displayed
    const expectedCategories = [
      'All',
      'Business',
      'Finance & Accounting',
      'IT & Software',
      'Office Productivity',
      'Personal Development',
      'Design',
      'Arts',
      'Marketing',
      'Lifestyle',
      'Photography & Video',
      'Health & Fitness',
      'Music',
      'Sports',
      'Teaching & Academics'
    ];
    
    // Verify each category is displayed in the component
    expectedCategories.forEach(category => {
      expect(screen.getByText(category)).toBeInTheDocument();
    });
  });

  /**
   * Interaction tests
   * These verify the component responds correctly to user interactions
   */
  
  test('calls onClose when a category is clicked', () => {
    render(<CategoriesTab show={true} onClose={mockOnClose} />);
    
    // Click on a category link
    const businessLink = screen.getByText('Business');
    if (businessLink) {
      fireEvent.click(businessLink);
    }
    
    // Verify onClose was called after clicking
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('each category link has the correct href', () => {
    render(<CategoriesTab show={true} onClose={mockOnClose} />);
    
    // Test a representative sample of categories
    // Check that URLs are properly formatted with correct slugs
    
    const businessLink = screen.getByText('Business').closest('a') as HTMLAnchorElement;
    expect(businessLink.getAttribute('href')).toBe('/browse/category/business');
    
    // Test category with spaces and ampersand
    const financeLink = screen.getByText('Finance & Accounting').closest('a') as HTMLAnchorElement;
    expect(financeLink.getAttribute('href')).toBe('/browse/category/finance-accounting');
    
    // Test multi-word category
    const personalDevLink = screen.getByText('Personal Development').closest('a') as HTMLAnchorElement;
    expect(personalDevLink.getAttribute('href')).toBe('/browse/category/personal-development');
  });

  test('clicking the close button calls onClose', () => {
    render(<CategoriesTab show={true} onClose={mockOnClose} />);
    
    // Clear any previous calls before our test action
    mockOnClose.mockClear();
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    if (closeButton) {
      fireEvent.click(closeButton);
    }
    
    // Verify onClose was called after clicking (without checking exact call count)
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('all link points to browse page', () => {
    render(<CategoriesTab show={true} onClose={mockOnClose} />);
    
    // Verify the "All" link points to the main browse page without category filter
    const allLink = screen.getByText('All').closest('a') as HTMLAnchorElement;
    expect(allLink.getAttribute('href')).toBe('/browse');
  });
});