"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Dropdown, Button } from "react-bootstrap";
import { FaChevronRight } from "react-icons/fa";
import dynamic from 'next/dynamic';
import ListingCardSkeleton from "./ListingCardSkeleton";
import Link from "next/link";
import styles from "@/styles/SavedListings.module.css";
import { createClient } from "@/utils/supabase/client";
import { 
  getUserSavedListings, 
  getCategories, 
  getListingTypes,
  encodeCategory,
  getListingRating,
  getUserProfile
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
    const [savedListings, setSavedListings] = useState<any[]>([]);
    const [selectedListingType, setSelectedListingType] = useState("All Types");
    const [filteredListings, setFilteredListings] = useState<any[]>([]);
    const [listingsByCategory, setListingsByCategory] = useState<Record<string, any[]>>({});
    const [listingMetadata, setListingMetadata] = useState<Record<string, { 
      authorName: string, 
      authorProfilePic?: string,
      rating: number,
      reviewCount: number
    }>>({});
    
    // Get categories and listing types from database utility functions
    // Memoize to prevent recreation on every render
    const categories = useMemo(() => getCategories(), []);
    const listingTypeOptions = useMemo(() => getListingTypes(), []);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);
    const [totalPages, setTotalPages] = useState(1);
    
    // Fetch saved listings from database - don't include router in dependencies
    const fetchSavedListings = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Use window.location instead of router to prevent dependency issues
          window.location.href = '/login';
          return;
        }
        
        setUserId(session.user.id);
        
        // Fetch user's saved listings
        const userSavedListings = await getUserSavedListings(session.user.id);
        
        // Transform the data structure to what we need
        const transformedListings = userSavedListings.map(savedItem => ({
          id: savedItem.listing.id,
          title: savedItem.listing.title,
          image: savedItem.listing.image_url || "/listing-default-photo.png",
          listingType: savedItem.listing.listing_type,
          category: savedItem.listing.category,
          user_id: savedItem.listing.user_id,
          dateSaved: savedItem.saved_at
        }));
        
        setSavedListings(transformedListings);
        
        // Fetch metadata for each listing in parallel
        const metadataPromises = transformedListings.map(async (listing) => {
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
            // Return default values if metadata fetch fails
            return {
              listingId: listing.id,
              authorName: "Unknown User",
              rating: 0,
              reviewCount: 0
            };
          }
        });
        
        const metadataResults = await Promise.all(metadataPromises);
        
        // Convert to record object for easy lookup
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
    }, [supabase]); // Only depend on supabase, not router
    
    // Load saved listings on mount - once only
    useEffect(() => {
      fetchSavedListings();
    }, []); // Empty dependency array to run only once
    
    // Filter listings whenever savedListings or selectedListingType changes
    useEffect(() => {
      if (!savedListings || savedListings.length === 0) return;
      
      const filtered = selectedListingType === "All Types" 
        ? savedListings 
        : savedListings.filter(listing => listing.listingType === selectedListingType);
      
      setFilteredListings(filtered);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / itemsPerPage)));
      setCurrentPage(1); // Reset to first page on filter change
      
      // Group filtered listings by category
      const grouped = categories.reduce((acc, category) => {
        acc[category] = filtered.filter(listing => listing.category === category);
        return acc;
      }, {} as Record<string, any[]>);
      
      setListingsByCategory(grouped);
    }, [selectedListingType, savedListings, categories, itemsPerPage]);
    
    // Handler for dropdown selection - memoized to prevent recreation
    const handleListingTypeSelect = useCallback((eventKey: string | null) => {
      if (eventKey) {
        setSelectedListingType(eventKey);
      }
    }, []);
  
    // Pagination handlers - memoized to prevent recreation
    const handlePageChange = useCallback((pageNumber: number) => {
      setCurrentPage(pageNumber);
    }, []);
    
    // For the retry button
    const handleRetry = useCallback(() => {
      fetchSavedListings();
    }, [fetchSavedListings]);
  
    // Show loading state
    if (isLoading) {
      return (
        <div className={styles.pageContainer}>
          <Container>
            <p className="text-center my-5">Loading your saved listings...</p>
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
              <Button variant="primary" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </Container>
        </div>
      );
    }
  
    return (
      <div className={styles.pageContainer}>
        <Container>
          <div className={styles.pageHeader}>
            <div className={styles.titleContainer}>
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
            
            // Only show categories with listings
            if (categoryListings.length === 0) return null;
            
            const categoryUrl = `/saved-listings/category/${encodeCategory(category)}`;
            
            // Show only top 8 listings per category on the main page
            const displayListings = categoryListings.slice(0, 8);
            
            return (
              <div key={category} className={styles.categorySection}>
                <Link href={categoryUrl} className={styles.categoryTitleLink}>
                  <h2 className={styles.categoryTitle}>
                    {category}
                    <FaChevronRight className={styles.categoryArrow} />
                    <span className={styles.categoryCount}>
                      ({categoryListings.length})
                    </span>
                  </h2>
                </Link>
                <Row>
                  {displayListings.map((listing) => {
                    const metadata = listingMetadata[listing.id] || {
                      authorName: "Unknown User",
                      rating: 0,
                      reviewCount: 0
                    };
                    
                    return (
                      <Col key={listing.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
                        <ListingCard 
                          id={listing.id}
                          title={listing.title}
                          image={listing.image}
                          listingType={listing.listingType}
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
              <Link href="/" className={styles.browseListingsBtn}>
                Browse Listings
              </Link>
            </div>
          )}
        </Container>
      </div>
    );
  }