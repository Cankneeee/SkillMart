// File: src/components/MyListings.tsx
'use client';
import { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Dropdown, Button } from "react-bootstrap";
import { FaPlus, FaChevronRight } from "react-icons/fa";
import dynamic from 'next/dynamic';
import ListingCardSkeleton from "./ListingCardSkeleton";
import Link from "next/link";
import styles from "@/styles/MyListings.module.css"; // Using MyListings styles
import { createClient } from "@/utils/supabase/client";
import {
  getUserListings,
  getCategories,
  getListingTypes,
  encodeCategory,
  Listing, // Ensure Listing type is imported
  getUserProfile,
  getListingRating
} from "@/lib/database";
import { useRouter } from "next/navigation";

// Lazy load the ListingCard component
const ListingCard = dynamic(() => import('@/components/ListingCard'), {
  loading: () => <ListingCardSkeleton />
});

export default function MyListings() {
  const supabase = createClient();
  const router = useRouter();

  // State for user and loading
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Added error state

  // State for listings
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingType, setSelectedListingType] = useState("All Types");
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [listingsByCategory, setListingsByCategory] = useState<Record<string, Listing[]>>({});
  const [listingMetadata, setListingMetadata] = useState<Record<string, { authorName: string, authorProfilePic?: string, rating: number, reviewCount: number }>>({});

  // Memoize categories and listing types
  const categories = useMemo(() => getCategories(), []);
  const listingTypeOptions = useMemo(() => getListingTypes(), []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // Adjust as needed
  const [totalPages, setTotalPages] = useState(1);

  // Fetch user session and listings
  const fetchUserAndListings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null); // Reset error on fetch
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login'; // Redirect if not logged in
        return;
      }
      setUserId(session.user.id);

      // Fetch user's listings
      const userListings = await getUserListings(session.user.id);
      setListings(userListings);

      // Fetch metadata for each listing in parallel
      const metadataPromises = userListings.map(async (listing) => {
          try {
              const [ownerProfile, ratingData] = await Promise.all([
                  getUserProfile(listing.user_id),
                  getListingRating(listing.id)
              ]);
              return {
                  listingId: listing.id,
                  authorName: ownerProfile?.username || "Unknown User",
                  authorProfilePic: ownerProfile?.profile_picture,
                  rating: ratingData.average,
                  reviewCount: ratingData.count
              };
          } catch (err) {
              return { listingId: listing.id, authorName: "Unknown User", rating: 0, reviewCount: 0 };
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
      console.error("Error fetching user or listings:", err);
      setError(err.message || "Failed to load listings"); // Set error state
    } finally {
      setIsLoading(false);
    }
  }, [supabase]); // Only depend on supabase

  // Load user listings on mount
  useEffect(() => {
    fetchUserAndListings();
  }, [fetchUserAndListings]);

  // Filter listings when the selected type changes
  useEffect(() => {
    if (!listings || listings.length === 0) {
        setFilteredListings([]);
        setListingsByCategory({});
        setTotalPages(1);
        return;
    };

    const filtered = selectedListingType === "All Types"
      ? listings
      : listings.filter(listing => listing.listing_type === selectedListingType);

    setFilteredListings(filtered);
    setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage)));
    setCurrentPage(1); // Reset to first page on filter change

    // Group filtered listings by category
    const grouped = categories.reduce((acc, category) => {
      acc[category] = filtered.filter(listing => listing.category === category);
      return acc;
    }, {} as Record<string, Listing[]>);
    setListingsByCategory(grouped);

  }, [selectedListingType, listings, categories, itemsPerPage]);

  // Handler for dropdown selection
  const handleListingTypeSelect = useCallback((eventKey: string | null) => {
    if (eventKey) {
      setSelectedListingType(eventKey);
    }
  }, []);

  // For the retry button
  const handleRetry = useCallback(() => {
    fetchUserAndListings();
  }, [fetchUserAndListings]);

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <Container>
          <p className="text-center my-5">Loading your listings...</p>
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
            <h1 className={styles.pageTitle}>My Listings</h1>
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
            <Link href="/create-listing" className={styles.createButton}>
              <Button variant="primary" className={styles.createButtonInner}>
                <FaPlus className={styles.createIcon} /> Create Listing
              </Button>
            </Link>
          </div>
        </div>

        {categories.map((category) => {
          const categoryListings = listingsByCategory[category] || [];
          if (categoryListings.length === 0) return null;
          const categoryUrl = `/my-listings/category/${encodeCategory(category)}`;
          // No pagination needed here, show all listings for the category
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
                {categoryListings.map((listing) => {
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
                )})}
              </Row>
              {/* Removed View More Link as all are shown */}
            </div>
          );
        })}

        {filteredListings.length === 0 && (
          <div className={styles.emptyState}>
            <p>No listings found for the selected filter.</p>
            {/* Optionally add a button to create a listing if none exist */}
            {listings.length === 0 && (
                 <Link href="/create-listing">
                 <Button variant="primary" className={styles.emptyStateButton}>Create Your First Listing</Button>
               </Link>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
