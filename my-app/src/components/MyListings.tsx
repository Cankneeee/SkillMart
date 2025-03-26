'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Dropdown, Button } from "react-bootstrap";
import { FaPlus, FaChevronRight } from "react-icons/fa";
import dynamic from 'next/dynamic';
import ListingCardSkeleton from "./ListingCardSkeleton";
import Link from "next/link";
import styles from "@/styles/MyListings.module.css";
import { createClient } from "@/utils/supabase/client";
import { 
  getUserListings, 
  getCategories, 
  getListingTypes, 
  encodeCategory,
  Listing,
  getUserProfile,
  getListingRating
} from "@/lib/database";

// Lazy load the ListingCard component
const ListingCard = dynamic(() => import('@/components/ListingCard'), {
  loading: () => <ListingCardSkeleton />
});

export default function MyListings() {
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedListingType, setSelectedListingType] = useState("All Types");
    const [listings, setListings] = useState<Listing[]>([]);
    const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
    const [listingsByCategory, setListingsByCategory] = useState<Record<string, Listing[]>>({});
    const [listingMetadata, setListingMetadata] = useState<Record<string, { 
      authorName: string, 
      authorProfilePic?: string,
      rating: number,
      reviewCount: number
    }>>({});
    
    // Memoize categories and listing types to prevent re-creation on each render
    const categories = useMemo(() => getCategories(), []);
    const listingTypeOptions = useMemo(() => getListingTypes(), []);
    
    // Function to fetch listings and metadata
    const fetchUserAndListings = useCallback(async () => {
      try {
        setIsLoading(true);
        
        // Get the current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Redirect to login if no session
          window.location.href = '/login';
          return;
        }
        
        setUserId(session.user.id);
        
        // Fetch user's listings
        const userListings = await getUserListings(session.user.id);
        setListings(userListings);
        
        // Fetch metadata for each listing in parallel
        const metadataPromises = userListings.map(async (listing) => {
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
      } catch (error) {
        console.error("Error fetching user or listings:", error);
      } finally {
        setIsLoading(false);
      }
    }, [supabase]);
    
    // Get user ID and fetch listings on component mount
    useEffect(() => {
      fetchUserAndListings();
    }, [fetchUserAndListings]);
    
    // Filter listings when the selected type changes
    useEffect(() => {
      if (!listings || listings.length === 0) return;
      
      const filtered = selectedListingType === "All Types" 
        ? listings 
        : listings.filter(listing => listing.listing_type === selectedListingType);
      
      setFilteredListings(filtered);
      
      // Group filtered listings by category
      const grouped = categories.reduce((acc, category) => {
        acc[category] = filtered.filter(listing => listing.category === category);
        return acc;
      }, {} as Record<string, Listing[]>);
      
      setListingsByCategory(grouped);
    }, [selectedListingType, listings, categories]);
    
    // Handler for dropdown selection
    const handleListingTypeSelect = useCallback((eventKey: string | null) => {
      if (eventKey) {
        setSelectedListingType(eventKey);
      }
    }, []);
  
    if (isLoading) {
      return (
        <div className={styles.pageContainer}>
          <Container>
            <p className="text-center my-5">Loading your listings...</p>
          </Container>
        </div>
      );
    }
  
    return (
      <div className={styles.pageContainer}>
        <Container>
          <div className={styles.pageHeader}>
            <div className={styles.titleContainer}>
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
                  <FaPlus className={styles.createIcon} />
                  Create Listing
                </Button>
              </Link>
            </div>
          </div>
          
          {categories.map((category) => {
            const categoryListings = listingsByCategory[category] || [];
            
            // Only show categories with listings
            if (categoryListings.length === 0) return null;
            
            const categoryUrl = `/my-listings/category/${encodeCategory(category)}`;
            
            return (
              <div key={category} className={styles.categorySection}>
                <Link href={categoryUrl} className={styles.categoryTitleLink}>
                  <h2 className={styles.categoryTitle}>
                    {category}
                    <FaChevronRight className={styles.categoryArrow} />
                  </h2>
                </Link>
                <Row>
                  {categoryListings.map((listing) => {
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
              </div>
            );
          })}
          
          {filteredListings.length === 0 && !isLoading && (
            <div className={styles.emptyState}>
              <p>No listings found for the selected filter.</p>
              <Link href="/create-listing">
                <Button variant="primary">Create Your First Listing</Button>
              </Link>
            </div>
          )}
        </Container>
      </div>
    );
  }