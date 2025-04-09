// File: src/components/SavedListings.tsx
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Dropdown, Button } from "react-bootstrap";
import { FaChevronRight } from "react-icons/fa";
import dynamic from 'next/dynamic';
import ListingCardSkeleton from "./ListingCardSkeleton";
import Link from "next/link";
import styles from "@/styles/SavedListings.module.css"; // Using SavedListings styles
import { createClient } from "@/utils/supabase/client";
import {
  getUserSavedListings,
  getCategories,
  getListingTypes,
  encodeCategory,
  getListingRating,
  getUserProfile,
  Listing, // Ensure Listing type is imported
  SavedListing // Ensure SavedListing type is imported
} from "@/lib/database";
import { useRouter } from "next/navigation";

// Lazy load the ListingCard component
const ListingCard = dynamic(() => import('@/components/ListingCard'), {
  loading: () => <ListingCardSkeleton />
});

export default function SavedListings() {
  const supabase = createClient();
  const router = useRouter();

  // State for user and loading
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for listings
  const [savedListings, setSavedListings] = useState<(SavedListing & { listing: Listing })[]>([]);
  const [selectedListingType, setSelectedListingType] = useState("All Types");
  const [filteredListings, setFilteredListings] = useState<(SavedListing & { listing: Listing })[]>([]);
  const [listingsByCategory, setListingsByCategory] = useState<Record<string, (SavedListing & { listing: Listing })[]>>({});
  const [listingMetadata, setListingMetadata] = useState<Record<string, { authorName: string, authorProfilePic?: string, rating: number, reviewCount: number }>>({});

  // Memoize categories and listing types
  const categories = useMemo(() => getCategories(), []);
  const listingTypeOptions = useMemo(() => getListingTypes(), []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch saved listings from database
  const fetchSavedListings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login'; // Redirect if not logged in
        return;
      }
      setUserId(session.user.id);

      // Fetch user's saved listings
      const userSavedListings = await getUserSavedListings(session.user.id);
      setSavedListings(userSavedListings); // Store the raw saved listings

      // Fetch metadata for each listing in parallel
      const metadataPromises = userSavedListings.map(async (item) => {
          try {
              const [ownerProfile, ratingData] = await Promise.all([
                  getUserProfile(item.listing.user_id),
                  getListingRating(item.listing.id)
              ]);
              return {
                  listingId: item.listing.id,
                  authorName: ownerProfile?.username || "Unknown User",
                  authorProfilePic: ownerProfile?.profile_picture,
                  rating: ratingData.average,
                  reviewCount: ratingData.count
              };
          } catch (err) {
              return { listingId: item.listing.id, authorName: "Unknown User", rating: 0, reviewCount: 0 };
          }
      });
      const metadataResults = await Promise.all(metadataPromises);
      const metadataRecord = metadataResults.reduce((acc, item) => {
          acc[item.listingId] = {
              authorName: item.authorName,
              authorProfilePic: item.authorProfilePic,
              rating: item.rating,
              reviewCount: item.reviewCount
          };
          return acc;
      }, {} as Record<string, any>);
      setListingMetadata(metadataRecord);

    } catch (err: any) {
      console.error("Error fetching saved listings:", err);
      setError(err.message || "Failed to load saved listings");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]); // Only depend on supabase

  // Load saved listings on mount
  useEffect(() => {
    fetchSavedListings();
  }, [fetchSavedListings]);

  // Filter listings whenever savedListings or selectedListingType changes
  useEffect(() => {
    if (!savedListings || savedListings.length === 0) {
      setFilteredListings([]);
      setListingsByCategory({});
      setTotalPages(1);
      return;
    }

    const filtered = selectedListingType === "All Types"
      ? savedListings
      : savedListings.filter(item => item.listing.listing_type === selectedListingType);

    setFilteredListings(filtered);
    setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage)));
    setCurrentPage(1); // Reset to first page on filter change

    // Group filtered listings by category
    const grouped = categories.reduce((acc, category) => {
      acc[category] = filtered.filter(item => item.listing.category === category);
      return acc;
    }, {} as Record<string, (SavedListing & { listing: Listing })[]>);
    setListingsByCategory(grouped);

  }, [selectedListingType, savedListings, categories, itemsPerPage]);

  // Handler for dropdown selection
  const handleListingTypeSelect = useCallback((eventKey: string | null) => {
    if (eventKey) {
      setSelectedListingType(eventKey);
    }
  }, []);

  // For the retry button
  const handleRetry = useCallback(() => {
    fetchSavedListings();
  }, [fetchSavedListings]);

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <Container>
          <p className="text-center my-5">Loading your saved listings...</p>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <Container>
          <div className="text-center my-5">
            <p className="text-danger">{error}</p>
            <Button variant="primary" onClick={handleRetry}> Try Again </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Container>
        <div className={styles.pageHeader}>
          {/* MODIFIED: Removed titleContainer div, title and count are direct children */}
          <div>
            <h1 className={styles.pageTitle}>Saved Listings</h1>
            <span className={styles.listingCount}>
              ({filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''})
            </span>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.filterContainer}>
              <span className={styles.filterLabel}>Filter by:</span>
              <Dropdown onSelect={handleListingTypeSelect}>
                <Dropdown.Toggle variant="light" className={styles.dropdownToggle}>
                  {selectedListingType}
                </Dropdown.Toggle>
                <Dropdown.Menu className={styles.dropdownMenu}>
                  {listingTypeOptions.map((type) => (
                    <Dropdown.Item
                      key={type}
                      eventKey={type}
                      active={selectedListingType === type}
                      className={styles.dropdownItem}
                    >
                      {type}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </div>

        {categories.map((category) => {
          const categoryListings = listingsByCategory[category] || [];
          if (categoryListings.length === 0) return null;
          const categoryUrl = `/saved-listings/category/${encodeCategory(category)}`;
          const displayListings = categoryListings.slice(0, 8); // Show only top 8

          return (
            <div key={category} className={styles.categorySection}>
              <Link href={categoryUrl} className={styles.categoryTitleLink}>
                <h2 className={styles.categoryTitle}>
                  {category}
                  <FaChevronRight className={styles.categoryArrow} />
                  <span className={styles.categoryCount}>({categoryListings.length})</span>
                </h2>
              </Link>
              <Row>
                {displayListings.map((item) => {
                  const listing = item.listing;
                  const metadata = listingMetadata[listing.id] || { authorName: "Unknown User", rating: 0, reviewCount: 0 };
                  return (
                    <Col key={listing.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
                      <ListingCard
                        id={listing.id}
                        title={listing.title}
                        image={listing.image_url || "/listing-default-photo.png"}
                        listingType={listing.listing_type}
                        category={listing.category}
                        user_id={listing.user_id}
                        authorName={metadata.authorName}
                        authorProfilePic={metadata.authorProfilePic}
                        rating={metadata.rating}
                        reviewCount={metadata.reviewCount}
                      />
                    </Col>
                  );
                })}
              </Row>
              {categoryListings.length > 8 && (
                <div className={styles.viewMoreContainer}>
                  <Link href={categoryUrl} className={styles.viewMoreLink}>
                    View all {categoryListings.length} saved listings in {category}
                  </Link>
                </div>
              )}
            </div>
          );
        })}

        {filteredListings.length === 0 && (
          <div className={styles.emptyState}>
            <p>No saved listings found for the selected filter.</p>
            <p className={styles.emptyStateSubtext}>
              Browse listings and click the bookmark button to save them for later.
            </p>
            <Link href="/browse" className={styles.browseListingsBtn}>
              Browse Listings
            </Link>
          </div>
        )}
      </Container>
    </div>
  );
}