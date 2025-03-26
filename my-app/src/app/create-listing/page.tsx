import ListingCreationForm from "@/components/ListingCreationForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creating Listing',
  description: 'Create a new listing on SkillMart',
  keywords: ['create listing', 'skill sharing']
 };

export default function CreateListingPage() {
  return (
    <main>
      <ListingCreationForm />
    </main>
  );
}