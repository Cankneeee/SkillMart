"use client";

import { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Dropdown, InputGroup, FormControl, Button, Pagination } from "react-bootstrap";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import dynamic from 'next/dynamic';
import ListingCardSkeleton from "./ListingCardSkeleton";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import styles from "@/styles/BrowseCategoryListings.module.css";
import { createClient } from "@/utils/supabase/client";
import { 
  getListings, 
  getListingTypes,
  getCategories,
  getCategoryMapping,
  decodeCategoryFromSlug,
  getListingRating,
  getUserProfile,
  Listing
} from "@/lib/database";

// Lazy load the ListingCard component
const ListingCard = dynamic(() => import('@/components/ListingCard'), {
  loading: () => <ListingCardSkeleton />
});

export default function BrowseCategoryListings() {
    const supabase = createClient();
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    
    // Debugging output for URL and parameters
    console.log("Current pathname:", pathname);
    console.log("URL params:", params);
    
    const encodedCategory = params.category as string;
    console.log("Encoded category from URL:", encodedCategory);
    
    // Implement a more robust category decoding method
    const getCategoryNameFromSlug = (slug: string): string | null => {
      console.log("Attempting to decode slug:", slug);
      
      // Method 1: Try direct mapping first
      const categoryMapping = getCategoryMapping();
      console.log("Category mapping:", categoryMapping);
      if (categoryMapping[slug]) {
        console.log("Found via direct mapping:", categoryMapping[slug]);
        return categoryMapping[slug];
      }
      
      // Method 2: Try case-insensitive lookup
      const lowerSlug = slug.toLowerCase();
      const lowerCaseMapping: Record<string, string> = {};
      Object.entries(categoryMapping).forEach(([key, value]) => {
        lowerCaseMapping[key.toLowerCase()] = value;
      });
      
      if (lowerCaseMapping[lowerSlug]) {
        console.log("Found via case-insensitive lookup:", lowerCaseMapping[lowerSlug]);
        return lowerCaseMapping[lowerSlug];
      }
      
      // Method 3: Try manual encoding of all categories to find a match
      const allCategories = getCategories();
      console.log("All categories:", allCategories);
      
      for (const category of allCategories) {
        const encoded = category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-');
        console.log(`Checking if "${encoded}" matches "${slug}"`);
        if (encoded === slug || encoded === lowerSlug) {
          console.log("Found via manual encoding:", category);
          return category;
        }
      }
      
      console.log("No category match found for slug:", slug);
      return null;
    };
    
    // Use our robust method to find the category name
    const categoryName = getCategoryNameFromSlug(encodedCategory);
    console.log("Final decoded category name:", categoryName);
    
    // State for loading and error
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State for filters and search
    const [selectedListingType, setSelectedListingType] = useState("All Types");
    const [searchQuery, setSearchQuery] = useState("");
    
    // State for listings
    const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
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
    
    // Get listing type options from database
    const listingTypeOptions = getListingTypes();
    
    useEffect(() => {
      console.log("Checking if redirect needed");
      console.log("- categoryName:", categoryName);
      console.log("- encodedCategory:", encodedCategory);
      
      // Only redirect if we have an encoded category but couldn't decode it
      if (!categoryName && encodedCategory) {
        console.log("No matching category found, redirecting to /browse");
        router.push('/browse');
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
    
    // Fetch listings based on category and filters
    const fetchListings = useCallback(async () => {
      try {
        console.log("Fetching listings for category:", categoryName);
        setIsLoading(true);
        setError(null);
        
        // Get listings filtered by category and listing type
        const fetchedListings = await getListings(
          selectedListingType !== "All Types" ? selectedListingType : undefined,
          categoryName
        );
        
        console.log(`Found ${fetchedListings.length} listings for category ${categoryName}`);
        
        // Apply search filter if needed
        const searchFiltered = searchQuery 
          ? fetchedListings.filter(listing => 
              listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              listing.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : fetchedListings;
        
        setFilteredListings(searchFiltered);
        setTotalPages(Math.max(1, Math.ceil(searchFiltered.length / itemsPerPage)));
        setCurrentPage(1); // Reset to first page when filters change
        
        // Fetch metadata for each listing in parallel (batch in groups of 10 to avoid overwhelming the DB)
        const batchSize = 10;
        const metadataRecord: Record<string, any> = {};
        
        for (let i = 0; i < searchFiltered.length; i += batchSize) {
          const batch = searchFiltered.slice(i, i + batchSize);
          
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
        setFilteredListings([]);
      } finally {
        setIsLoading(false);
      }
    }, [selectedListingType, searchQuery, categoryName, itemsPerPage]);
    
    // Initial fetch on component mount and when filters change
    useEffect(() => {
      if (categoryName) {
        fetchListings();
      }
    }, [fetchListings, categoryName]);
    
    // Handler for dropdown selection
    const handleListingTypeSelect = (eventKey: string | null) => {
      if (eventKey) {
        setSelectedListingType(eventKey);
      }
    };
  
    // Handle search input
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    };
  
    // Handle search form submission
    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Already filters on input change, but this prevents form submission
    };
  
    // Clear search query
    const handleClearSearch = () => {
      setSearchQuery("");
    };
  
    // Reset listing type filter
    const handleResetFilter = () => {
      setSelectedListingType("All Types");
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
            <p className="text-center my-5">Loading listings for {categoryName}...</p>
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
  
    // Get the current page of listings
    const currentListings = getCurrentListings();
  
    return (
      <div className={styles.pageContainer}>
        <Container>
          <div className={styles.pageHeader}>
            <div className={styles.titleContainer}>
              <Link href="/browse" className={styles.backLink}>
                <FaArrowLeft className={styles.backIcon} />
                <span>Back to Browse</span>
              </Link>
              <h1 className={styles.pageTitle}>{categoryName}</h1>
              <span className={styles.listingCount}>
                ({filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''})
              </span>
            </div>
            
            <div className={styles.headerActions}>
              <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                <InputGroup>
                  <FormControl
                    placeholder={`Search in ${categoryName}...`}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                  />
                  <Button variant="primary" type="submit" className={styles.searchButton}>
                    <FaSearch />
                  </Button>
                </InputGroup>
              </form>
              
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
                {currentListings.map((listing) => {
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
              <p>No listings found in this category for the selected criteria.</p>
              {(searchQuery || selectedListingType !== "All Types") && (
                <p className={styles.emptyStateSubtext}>
                  Try adjusting your filters or search terms.
                </p>
              )}
              <div className={styles.emptyStateActions}>
                {searchQuery && (
                  <Button 
                    variant="outline-secondary" 
                    className={styles.clearSearchButton}
                    onClick={handleClearSearch}
                  >
                    Clear Search
                  </Button>
                )}
                {selectedListingType !== "All Types" && (
                  <Button 
                    variant="outline-secondary" 
                    className={styles.resetFilterButton}
                    onClick={handleResetFilter}
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            </div>
          )}
        </Container>
      </div>
    );
  }