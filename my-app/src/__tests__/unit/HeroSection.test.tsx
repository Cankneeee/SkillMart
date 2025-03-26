import { render, screen } from '@testing-library/react';
import HeroSection from '@/components/HeroSection';

/**
 * Mock dependencies
 * 
 * We only need to mock the Next.js Link component and the CSS modules
 * for this simple component.
 */
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock CSS modules
jest.mock('@/styles/HeroSection.module.css', () => ({
  hero: 'mock-hero-class',
  content: 'mock-content-class',
  highlight: 'mock-highlight-class',
  description: 'mock-description-class',
  ctaButton: 'mock-cta-button-class',
}));

describe('HeroSection', () => {
  /**
   * Basic rendering tests
   * These verify the component renders all expected content correctly
   */
  
  test('renders the main heading with highlight', () => {
    render(<HeroSection />);
    
    // Check for the heading text
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Unlock Your Potential with')).toBeInTheDocument();
    expect(screen.getByText('SkillMart')).toHaveClass('mock-highlight-class');
  });

  test('renders the tagline', () => {
    render(<HeroSection />);
    
    expect(screen.getByText('Learn, Share, and Trade Skills with a Thriving Community.')).toBeInTheDocument();
  });

  test('renders the description text', () => {
    render(<HeroSection />);
    
    const expectedText = 'SkillMart is a marketplace where passionate individuals connect to exchange knowledge and services. Whether you want to teach, learn, or collaborate, this is your go-to hub for skill-sharing.';
    expect(screen.getByText(expectedText)).toBeInTheDocument();
    expect(screen.getByText(expectedText)).toHaveClass('mock-description-class');
  });

  test('renders the CTA button with correct link', () => {
    render(<HeroSection />);
    
    // Find the button
    const ctaButton = screen.getByRole('button', { name: 'Get Started Now' });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveClass('mock-cta-button-class');
    
    // Verify the button is wrapped in a link to the signup page
    const signupLink = ctaButton.closest('a');
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  test('renders the component with expected structure', () => {
    const { container } = render(<HeroSection />);
    
    // Check that the main section has the hero class
    const heroSection = container.firstChild;
    expect(heroSection).toHaveClass('mock-hero-class');
    
    // Check the content container has the content class
    const contentDiv = heroSection?.firstChild;
    expect(contentDiv).toHaveClass('mock-content-class');
  });
});