import HeroSection from '@/components/HeroSection';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home Page',
  description: 'Welcome to SkillMart, the platform for sharing your skills and knowledge',
  keywords: ['home', 'welcome', 'hero']
};

export default function HomePage() {
  return <HeroSection />;
}
