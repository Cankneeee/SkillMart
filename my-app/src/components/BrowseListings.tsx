"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Dropdown, Button, Pagination } from "react-bootstrap";
import { FaChevronRight } from "react-icons/fa";
import dynamic from 'next/dynamic';
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "@/styles/BrowseListings.module.css";
import { createClient } from "@/utils/supabase/client";
import { 
  getListings, 
  getCategories, 
  getListingTypes,
  encodeCategory,
  getListingRating,
  getUserProfile,
  Listing
} from "@/lib/database";
import { searchListings } from "@/lib/searchAlgorithm";

// Lazy load the ListingCard component
const ListingCard = dynamic(() => import('@/components/ListingCard'), {
  loading: () => <ListingCardSkeleton />
});

export default function BrowseListings() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const router = useRouter();
  
    // Get search query from URL
    const queryParam = searchParams.get("q") || "";
    
    // State for loading and error
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State for filters and search
    const [selectedListingType, setSelectedListingType] = useState("All Types");
    const [searchQuery, setSearchQuery] = useState(queryParam);
    
    // State for listings
    const [allListings, setAllListings] = useState<Listing[]>([]);
    const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
    const [listingsByCategory, setListingsByCategory] = useState<Record<string, Listing[]>>({});
    const [listingMetadata, setListingMetadata] = useState<Record<string, { 
      authorName: string, 
      authorProfilePic?: string,
      rating: number,
      reviewCount: number
    }>>({});
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);
    const [totalPages, setTotalPages] = useState(1);
    
    // Memoize categories and listing types to prevent recreation on every render
    const categories = useMemo(() => getCategories(), []);
    const listingTypeOptions = useMemo(() => getListingTypes(), []);
    
    // Update searchQuery when URL query parameter changes
    useEffect(() => {
      setSearchQuery(queryParam);
    }, [queryParam]);
    
    // Fetch all listings from database
    const fetchListings = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let fetchedListings: Listing[];
        
        // Use search or regular fetch based on searchQuery
        if (searchQuery.trim()) {
          fetchedListings = await searchListings(
            searchQuery, 
            selectedListingType !== "All Types" ? selectedListingType : undefined
          );
        } else {
          fetchedListings = await getListings(
            selectedListingType !== "All Types" ? selectedListingType : undefined
          );
        }
        
        setAllListings(fetchedListings);
        
        // Fetch metadata for each listing in parallel (batch in groups of 10 to avoid overwhelming the DB)
        const batchSize = 10;
        const metadataRecord: Record<string, any> = {};
        
        for (let i = 0; i < fetchedListings.length; i += batchSize) {
          const batch = fetchedListings.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (listing) => {
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
          
          const batchResults = await Promise.all(batchPromises);
          
          // Add batch results to metadata record
          batchResults.forEach(item => {
            metadataRecord[item.listingId] = {
              authorName: item.authorName,
              authorProfilePic: item.authorProfilePic,
              rating: item.rating,
              reviewCount: item.reviewCount
            };
          });
        }
        
        setListingMetadata(metadataRecord);
        
      } catch (err: any) {
        console.error("Error fetching listings:", err);
        setError(err.message || "Failed to load listings");
        setAllListings([]);
      } finally {
        setIsLoading(false);
      }
    }, [searchQuery, selectedListingType]); // Depend on both search query and listing type
    
    // Initial fetch on component mount and when search query changes
    useEffect(() => {
      fetchListings();
    }, [fetchListings]);
    
    // Filter and organize listings by category
    useEffect(() => {
      if (!allListings || allListings.length === 0) {
        setFilteredListings([]);
        setListingsByCategory({});
        setTotalPages(1);
        return;
      }
      
      // No additional filtering needed here since allListings is already filtered
      // by fetchListings based on searchQuery and selectedListingType
      setFilteredListings(allListings);
      setTotalPages(Math.max(1, Math.ceil(allListings.length / itemsPerPage)));
      setCurrentPage(1); // Reset to first page when filters change
      
      // Group filtered listings by category
      const grouped = categories.reduce((acc, category) => {
        acc[category] = allListings.filter(listing => listing.category === category);
        return acc;
      }, {} as Record<string, Listing[]>);
      
      setListingsByCategory(grouped);
    }, [allListings, categories, itemsPerPage]);
    
    // Handler for dropdown selection
    const handleListingTypeSelect = useCallback((eventKey: string | null) => {
      if (eventKey) {
        setSelectedListingType(eventKey);
      }
    }, []);
  
    // Handle clearing search
    const handleClearSearch = useCallback(() => {
      // Update the URL to remove the search query
      router.push("/browse");
    }, [router]);
  
    // Pagination handlers
    const handlePageChange = useCallback((pageNumber: number) => {
      setCurrentPage(pageNumber);
    }, []);
  
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
  
    // Get current listings based on pagination
    const getCurrentListings = () => {
      const indexOfLastItem = currentPage * itemsPerPage;
      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
      return filteredListings.slice(indexOfFirstItem, indexOfLastItem);
    };
  
    // Show loading state
    if (isLoading) {
      return (
        <div className={styles.pageContainer}>
          <Container>
            <p className="text-center my-5">Loading listings...</p>
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
              <Button variant="primary" onClick={() => fetchListings()}>
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
              <h1 className={styles.pageTitle}>
                {searchQuery ? `Search Results: "${searchQuery}"` : "Browse Listings"}
              </h1>
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
          
          {/* Display search controls if searching */}
          {searchQuery && (
            <div className="mb-4">
              <Button 
                variant="outline-secondary" 
                className={styles.clearSearchButton}
                onClick={handleClearSearch}
              >
                Clear Search Results
              </Button>
            </div>
          )}
          
          {/* Display listings by category */}
          {categories.map((category) => {
            const categoryListings = listingsByCategory[category] || [];
            
            // Only show categories with listings
            if (categoryListings.length === 0) return null;
            
            // IMPORTANT: This is the fixed line that ensures correct category URLs
            const encodedCategoryValue = encodeCategory(category);
            const categoryUrl = `/browse/category/${encodedCategoryValue}`;
            
            // Show only top 4 listings per category on the main page if not searching
            // Show all results when searching
            const displayListings = searchQuery 
              ? categoryListings
              : categoryListings.slice(0, 4);
            
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
                {!searchQuery && categoryListings.length > 4 && (
                  <div className={styles.viewMoreContainer}>
                    <Link href={categoryUrl} className={styles.viewMoreLink}>
                      View all {categoryListings.length} listings in {category}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Empty state */}
          {filteredListings.length === 0 && (
            <div className={styles.emptyState}>
              {searchQuery ? (
                <>
                  <p>No listings found for "{searchQuery}"</p>
                  <p className={styles.emptyStateSubtext}>
                    Try adjusting your search terms or clear the search to browse all listings.
                  </p>
                  <Button 
                    variant="outline-secondary" 
                    className={styles.clearSearchButton}
                    onClick={handleClearSearch}
                  >
                    Clear Search
                  </Button>
                </>
              ) : (
                <>
                  <p>No listings found with the selected filter.</p>
                  <p className={styles.emptyStateSubtext}>
                    Try selecting a different listing type.
                  </p>
                </>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {filteredListings.length > itemsPerPage && (
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
        </Container>
      </div>
    );
  }