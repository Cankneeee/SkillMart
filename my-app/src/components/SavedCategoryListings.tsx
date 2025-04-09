// src/components/SavedCategoryListings.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Dropdown, Button, Pagination } from "react-bootstrap";
import { FaArrowLeft } from "react-icons/fa";
import dynamic from 'next/dynamic';
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import styles from "@/styles/SavedCategoryListings.module.css";
import { createClient } from "@/utils/supabase/client";
import {
  getUserSavedListings,
  getListingTypes,
  getCategories,
  getCategoryMapping,
  getListingRating,
  getUserProfile,
  Listing,
  SavedListing
} from "@/lib/database";

// Lazy load the ListingCard component
const ListingCard = dynamic(() => import('@/components/ListingCard'), {
  loading: () => <ListingCardSkeleton />
});

export default function SavedCategoryListings() {
    const supabase = createClient();
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const encodedCategory = params.category as string;

    // Implement a more robust category decoding method
    const getCategoryNameFromSlug = (slug: string): string | null => {
      const categoryMapping = getCategoryMapping();
      if (categoryMapping[slug]) return categoryMapping[slug];
      const lowerSlug = slug.toLowerCase();
      const lowerCaseMapping: Record<string, string> = {};
      Object.entries(categoryMapping).forEach(([key, value]) => {
        lowerCaseMapping[key.toLowerCase()] = value;
      });
      if (lowerCaseMapping[lowerSlug]) return lowerCaseMapping[lowerSlug];
      const allCategories = getCategories();
      for (const category of allCategories) {
        const encoded = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-');
        if (encoded === slug || encoded === lowerSlug) return category;
      }
      return null;
    };

    const categoryName = getCategoryNameFromSlug(encodedCategory);

    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedListingType, setSelectedListingType] = useState("All Types");
    const [savedListings, setSavedListings] = useState<(SavedListing & { listing: Listing })[]>([]);
    const [filteredListings, setFilteredListings] = useState<(SavedListing & { listing: Listing })[]>([]);
    const [listingMetadata, setListingMetadata] = useState<Record<string, {
      authorName: string,
      authorProfilePic?: string,
      rating: number,
      reviewCount: number
    }>>({});

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(8);
    const [totalPages, setTotalPages] = useState(1);

    // Get listing types from database utility
    const listingTypeOptions = getListingTypes();

    // Redirect if category doesn't exist
    useEffect(() => {
      if (!categoryName && encodedCategory) {
        router.push('/saved-listings');
      }
    }, [categoryName, encodedCategory, router]);

    // If no category name (and we're not yet redirecting), show a loading state
    if (!categoryName) {
      return (
        <div className={styles.pageContainer}>
          <Container>
            <p className="text-center my-5">Loading category...</p>
          </Container>
        </div>
      );
    }

    // Fetch user session and saved listings
    const fetchUserAndListings = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        // *** UPDATED CODE: Use getUser() instead of getSession() ***
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          // Redirect to login if no authenticated user
          window.location.href = '/login';
          return;
        }

        setUserId(user.id);

        // Fetch user's saved listings (all types initially) for this category
        const userSavedListings = await getUserSavedListings(
          user.id,
          undefined, // Fetch all types initially
          categoryName // Fetch only for this category
        );

        setSavedListings(userSavedListings); // Store all fetched saved listings for this category

        // Fetch metadata for each listing in parallel
        const metadataRecord: Record<string, any> = {};
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
            console.error(`Error fetching metadata for listing ${item.listing.id}:`, err);
            return { // Default metadata on error
              listingId: item.listing.id, authorName: "N/A", rating: 0, reviewCount: 0
            };
          }
        });

        const metadataResults = await Promise.all(metadataPromises);
        metadataResults.forEach(item => {
          metadataRecord[item.listingId] = {
            authorName: item.authorName,
            authorProfilePic: item.authorProfilePic,
            rating: item.rating,
            reviewCount: item.reviewCount
          };
        });
        setListingMetadata(metadataRecord);

        // Initial filtering will be handled by useEffect below

      } catch (err: any) {
        console.error("Error fetching user or saved listings:", err);
        setError(err.message || "Failed to load saved listings");
        setSavedListings([]);
        setFilteredListings([]);
      } finally {
        setIsLoading(false);
      }
    // Add categoryName and itemsPerPage as dependencies
    }, [supabase, categoryName, itemsPerPage]);

    // Initial fetch on component mount
    useEffect(() => {
      if (categoryName) {
        fetchUserAndListings();
      }
    // fetchUserAndListings has dependencies, include it here
    }, [categoryName, fetchUserAndListings]);

    // Filter listings when the selected type or base listings change
    useEffect(() => {
      if (!savedListings) return; // Guard against null/undefined

      // Filter by listing type if not "All Types"
      const typeFiltered = selectedListingType === "All Types"
        ? savedListings // Already filtered by category in fetch
        : savedListings.filter(item => item.listing.listing_type === selectedListingType);

      setFilteredListings(typeFiltered);
      setTotalPages(Math.max(1, Math.ceil(typeFiltered.length / itemsPerPage)));
      setCurrentPage(1); // Reset to first page on filter change
    }, [selectedListingType, savedListings, itemsPerPage]);

    // Handler for dropdown selection
    const handleListingTypeSelect = (eventKey: string | null) => {
      if (eventKey) {
        setSelectedListingType(eventKey);
      }
    };

    // Pagination handlers
    const handlePageChange = (pageNumber: number) => {
      setCurrentPage(pageNumber);
    };

    // Get current listings based on pagination
    const getCurrentListings = () => {
      const indexOfLastItem = currentPage * itemsPerPage;
      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
      return filteredListings.slice(indexOfFirstItem, indexOfLastItem);
    };

    // Create pagination items
    const renderPaginationItems = () => {
      let items = [];
      for (let number = 1; number <= totalPages; number++) {
        items.push(
          <Pagination.Item
            key={number}
            active={number === currentPage}
            onClick={() => handlePageChange(number)}
          >
            {number}
          </Pagination.Item>
        );
      }
      return items;
    };

    // Show loading state
    if (isLoading) {
      return (
        <div className={styles.pageContainer}>
          <Container>
            <p className="text-center my-5">Loading your saved listings...</p>
             {/* Optionally show skeletons */}
             <Row>
                {Array.from({ length: 4 }).map((_, index) => (
                    <Col key={index} xs={12} sm={6} md={4} lg={3} className="mb-4">
                        <ListingCardSkeleton />
                    </Col>
                ))}
            </Row>
          </Container>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className={styles.pageContainer}>
          <Container>
            <div className="text-center my-5">
              <p className="text-danger">{error}</p>
              <Button variant="primary" onClick={fetchUserAndListings}>
                Try Again
              </Button>
            </div>
          </Container>
        </div>
      );
    }

    // Get current page of listings
    const currentListings = getCurrentListings();

    return (
      <div className={styles.pageContainer}>
        <Container>
          <div className={styles.pageHeader}>
            <div className={styles.titleContainer}>
              <Link href="/saved-listings" className={styles.backLink}>
                <FaArrowLeft className={styles.backIcon} />
                <span>Back to Saved Listings</span>
              </Link>
              <h1 className={styles.pageTitle}>{categoryName}</h1>
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

          {filteredListings.length > 0 ? (
            <>
              <Row>
                {currentListings.map((item) => {
                  const listing = item.listing;
                  const metadata = listingMetadata[listing.id] || {
                    authorName: "Loading...",
                    rating: 0,
                    reviewCount: 0
                  };

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

              {totalPages > 1 && (
                <div className={styles.paginationContainer}>
                  <Pagination>
                    <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                    <Pagination.Prev onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} />
                    {renderPaginationItems()}
                    <Pagination.Next onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} />
                    <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>No saved listings found in this category for the selected filter.</p>
              <Link href="/browse">
                <Button variant="primary">Browse Listings</Button>
              </Link>
            </div>
          )}
        </Container>
      </div>
    );
  }
