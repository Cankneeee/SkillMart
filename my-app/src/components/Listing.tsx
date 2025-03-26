"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Accordion, Button, Form, Dropdown } from "react-bootstrap";
import Image from "next/image";
import Head from "next/head";
import ImageSkeleton from "./ImageSkeleton";
import { FaUser, FaPen, FaTrash, FaCheck, FaTimes, FaBookmark } from "react-icons/fa";
import { useRouter } from "next/navigation";
import ReviewsSection from "./ReviewsSection";
import ConfirmationModal from "./ConfirmationModal";
import styles from "@/styles/Listing.module.css";
import { listingApi, userApi, savedListingApi } from "@/lib/api";
import { Listing as ListingType } from "@/lib/database";
import { createClient } from "@/utils/supabase/client";
import { 
  DEFAULT_LISTING_IMAGE,
  DEFAULT_PROFILE_IMAGE, 
  useImageWithFallback,
  uploadListingPicture 
} from "@/utils/imageUtils";
import { getUser } from "@/utils/auth";
import { getCategories, getListingTypes } from "@/lib/database";

interface ListingProps {
  listingId: string;
}

interface ListingData {
  title: string;
  description: string;
  listingType: string;
  category: string;
  pricing: string;
  image: string;
  contact: {
    email: string;
    phone: string;
  };
}

const Listing: React.FC<ListingProps> = ({ listingId }) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();
  
  // State
  const [listing, setListing] = useState<ListingType | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Listing data state
  const [listingData, setListingData] = useState<ListingData>({
    title: "",
    description: "",
    listingType: "Providing Skills",
    category: "Business",
    pricing: "",
    image: DEFAULT_LISTING_IMAGE,
    contact: {
      email: "",
      phone: "",
    },
  });

  // Editing states
  const [isEditingListing, setIsEditingListing] = useState(false);
  const [editedData, setEditedData] = useState<ListingData>({ ...listingData });
  
  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Use image with fallback hooks
  const { imgSrc: displayImage, onError: handleMainImgError } = useImageWithFallback(
    editedData.image,
    DEFAULT_LISTING_IMAGE
  );
  
  const { imgSrc: profileImgSrc, onError: handleProfileImgError } = useImageWithFallback(
    owner?.profile_picture || '',
    DEFAULT_PROFILE_IMAGE
  );

  // Check if using a custom image (not the default)
  const hasCustomImage = editedData.image !== DEFAULT_LISTING_IMAGE;

  // Get categories and listing types from database utility functions
  const categoryOptions = getCategories();
  const listingTypeOptions = getListingTypes().filter(type => type !== "All Types");

  // Functions for generating meta content
  const getMetaDescription = () => {
    // Create a concise description from the listing description
    if (!listing?.description) return "Find skills and services on SkillMart";
    
    // Truncate to reasonable length for meta description
    return listing.description.length > 160 
      ? `${listing.description.substring(0, 157)}...` 
      : listing.description;
  };

  // Get the current absolute URL for canonical and OG tags
  const getCanonicalUrl = () => {
    if (typeof window === 'undefined') return `https://skillmart.com/listing/${listingId}`;
    return `${window.location.origin}/listing/${listingId}`;
  };

  // Format for structured data
  const getJsonLd = () => {
    if (!listing) return "{}";
    
    // Build structured data object for the listing
    const structuredData: any = {
      "@context": "https://schema.org",
      "@type": "Service", // Or "Product" if more appropriate
      "name": listing.title,
      "description": listing.description,
      "image": listing.image_url || DEFAULT_LISTING_IMAGE,
      "offers": {
        "@type": "Offer",
        "price": listing.price ? listing.price.toString() : "Contact for pricing",
        "priceCurrency": "USD" // Update as appropriate
      },
      "provider": {
        "@type": "Person",
        "name": owner?.username || "SkillMart User"
      }
    };
    
    return JSON.stringify(structuredData);
  };

  // Fetch listing and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        
        // Check authentication status using auth utility
        const user = await getUser();
        if (user) {
          setUserId(user.id);
        }
        
        // Fetch the listing
        const { data: fetchedListing, error: listingError } = await listingApi.getListingById(listingId);
        
        if (listingError || !fetchedListing) {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(listingError || "Listing not found");
          router.push("/not-found");
          return;
        }
        
        setListing(fetchedListing);
        
        // Check if user is the owner
        if (user && fetchedListing.user_id === user.id) {
          setIsOwner(true);
        }
        
        // Fetch the owner's profile
        const { data: ownerProfile } = await userApi.getProfile(fetchedListing.user_id);
        
        if (ownerProfile) {
          setOwner(ownerProfile);
        } else {
          setOwner({ username: "Unknown User" });
        }
        
        // Check if the listing is saved by the user
        if (user) {
          const { data: isSaved } = await savedListingApi.isListingSaved(user.id, listingId);
          setIsSaved(isSaved || false);
        }
        
        // Set up the listing data
        const newListingData = {
          title: fetchedListing.title,
          description: fetchedListing.description,
          listingType: fetchedListing.listing_type,
          category: fetchedListing.category,
          pricing: fetchedListing.price ? fetchedListing.price.toString() : "",
          image: fetchedListing.image_url || DEFAULT_LISTING_IMAGE,
          contact: {
            email: "",
            phone: "",
          },
        };
        
        setListingData(newListingData);
        setEditedData(newListingData);
        
        setIsLoading(false);
      } catch (error: any) {
        console.error("Error fetching listing data:", error);
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(error?.message || "Failed to load listing data");
      }
    };
    
    if (listingId) {
      fetchData();
    } else {
      setIsLoading(false);
      setHasError(true);
      setErrorMessage("No listing ID provided");
    }
  }, [listingId, router]);

  // Handle bookmark listing
  const handleBookmarkListing = async () => {
    if (!userId) {
      router.push('/login');
      return;
    }
    
    try {
      if (isSaved) {
        const { error } = await savedListingApi.unsaveListing(userId, listingId);
        if (error) throw new Error(error);
        setIsSaved(false);
      } else {
        const { error } = await savedListingApi.saveListing(userId, listingId);
        if (error) throw new Error(error);
        setIsSaved(true);
      }
    } catch (error: any) {
      console.error("Error toggling bookmark:", error);
    }
  };

  // Handle edit listing - toggle editing mode
  const handleEditListing = () => {
    // Only allow the owner to edit
    if (!isOwner) return;
    
    setEditedData({ ...listingData });
    setIsEditingListing(true);
  };

  // Handle save listing changes
  const handleSaveListing = async () => {
    // Only allow the owner to save changes
    if (!isOwner || !userId || !listing) return;
    
    try {
      let image_url = editedData.image;
      
      // Upload image if custom image exists and a new file was uploaded
      if (hasCustomImage && uploadedFile) {
        const { imageUrl, error } = await uploadListingPicture(userId, uploadedFile);
        
        if (error) {
          console.error("Error uploading image:", error);
          // Continue with update even if image upload fails
        } else if (imageUrl) {
          image_url = imageUrl;
        }
      }
      
      // Prepare updated listing data
      const updatedData = {
        title: editedData.title,
        description: editedData.description,
        listing_type: editedData.listingType as "Providing Skills" | "Looking for Skills" | "Trading Skills",
        category: editedData.category,
        price: editedData.pricing ? parseFloat(editedData.pricing) : undefined,
        image_url: image_url !== DEFAULT_LISTING_IMAGE ? image_url : undefined
      };
      
      // Update the listing
      const { data: updatedListing, error } = await listingApi.updateListing(
        listingId,
        userId,
        updatedData
      );
      
      if (error) {
        throw new Error(error);
      }
      
      if (updatedListing) {
        setListing(updatedListing);
        const updatedListingData = {
          ...editedData,
          image: image_url
        };
        setListingData(updatedListingData);
        setIsEditingListing(false);
        setUploadedFile(null);
      }
    } catch (error: any) {
      console.error("Error updating listing:", error);
    }
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    setEditedData({ ...listingData });
    setIsEditingListing(false);
    setUploadedFile(null);
  };

  // Handle delete listing
  const handleDeleteListing = () => {
    // Only allow the owner to delete
    if (!isOwner) return;
    
    setShowDeleteModal(true);
  };

  // Confirm delete listing
  const confirmDeleteListing = async () => {
    // Only allow the owner to confirm deletion
    if (!isOwner || !userId) return;
    
    try {
      const { data: success, error } = await listingApi.deleteListing(listingId, userId);
      
      if (error) {
        throw new Error(error);
      }
      
      if (success) {
        setShowDeleteModal(false);
        router.push("/my-listings");
      } else {
        console.error("Failed to delete listing");
      }
    } catch (error: any) {
      console.error("Error deleting listing:", error.message);
    }
  };

  // Handle change in form inputs
  const handleInputChange = (field: string, value: string) => {
    setEditedData((prev) => {
      if (field === "email" || field === "phone") {
        return {
          ...prev,
          contact: {
            ...prev.contact,
            [field]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Handle image change
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow the owner to change images
    if (!isOwner) return;
    
    const file = event.target.files?.[0];
    if (!file) return;

    // Store the file for later upload
    setUploadedFile(file);
    
    // Create a temporary URL for preview
    const imageUrl = URL.createObjectURL(file);
    setEditedData(prev => ({
      ...prev,
      image: imageUrl
    }));
  };
  
  // Handle removing image
  const handleRemoveImage = () => {
    // Only allow the owner to remove images
    if (!isOwner) return;
    
    setEditedData(prev => ({
      ...prev,
      image: DEFAULT_LISTING_IMAGE
    }));
    setUploadedFile(null);
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Loading Listing | SkillMart</title>
          <meta name="description" content="Loading listing details on SkillMart" />
        </Head>
        <div className={styles.pageContainer}>
          <p className="text-center my-5">Loading listing...</p>
        </div>
      </>
    );
  }

  if (hasError) {
    return (
      <>
        <Head>
          <title>Error | SkillMart</title>
          <meta name="description" content="Error loading listing details" />
        </Head>
        <div className={styles.pageContainer}>
          <p className="text-center my-5 text-danger">
            Error loading listing: {errorMessage}
          </p>
          <div className="text-center">
            <Button onClick={() => router.push('/')}>
              Return to Home
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Head>
          <title>Listing Not Found | SkillMart</title>
          <meta name="description" content="The requested listing could not be found" />
        </Head>
        <div className={styles.pageContainer}>
          <p className="text-center my-5">Listing not found</p>
          <div className="text-center">
            <Button onClick={() => router.push('/')}>
              Return to Home
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{listingData.title} | SkillMart</title>
        <meta name="description" content={getMetaDescription()} />
        
        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content={`${listingData.title} | SkillMart`} />
        <meta property="og:description" content={getMetaDescription()} />
        <meta property="og:image" content={listingData.image !== DEFAULT_LISTING_IMAGE ? listingData.image : "https://skillmart.com/default-social-image.jpg"} />
        <meta property="og:url" content={getCanonicalUrl()} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${listingData.title} | SkillMart`} />
        <meta name="twitter:description" content={getMetaDescription()} />
        <meta name="twitter:image" content={listingData.image !== DEFAULT_LISTING_IMAGE ? listingData.image : "https://skillmart.com/default-social-image.jpg"} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={getCanonicalUrl()} />
        
        {/* Structured data */}
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: getJsonLd() }}
        />
        
        {/* Add additional meta tags for skills/categories */}
        <meta name="keywords" content={`skills, ${listingData.category}, ${listingData.listingType}, marketplace`} />
      </Head>

      <div className={styles.pageContainer}>
        <div className={styles.listingHeader}>
          <div className={styles.titleRow}>
            {isEditingListing ? (
              <Form.Control
                type="text"
                value={editedData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className={styles.titleInput}
              />
            ) : (
              <h1 className={styles.title}>{listingData.title}</h1>
            )}
            
            <div className={styles.actionButtons}>
              {isEditingListing ? (
                <>
                  <Button 
                    className={styles.actionButton}
                    onClick={handleSaveListing}
                    title="Save changes"
                  >
                    <FaCheck />
                  </Button>
                  <Button 
                    className={styles.actionButton}
                    onClick={handleDiscardChanges}
                    title="Discard changes"
                  >
                    <FaTimes />
                  </Button>
                </>
              ) : (
                <>
                  {/* Show bookmark button for all users */}
                  <Button 
                    className={styles.actionButton}
                    onClick={handleBookmarkListing}
                    title={isSaved ? "Remove bookmark" : "Bookmark listing"}
                  >
                    <FaBookmark color={isSaved ? "#7E57C2" : undefined} />
                  </Button>
                  
                  {/* Show edit/delete buttons only for the owner */}
                  {isOwner && (
                    <>
                      <Button 
                        className={styles.actionButton}
                        onClick={handleEditListing}
                        title="Edit listing"
                      >
                        <FaPen />
                      </Button>
                      <Button 
                        className={styles.actionButton}
                        onClick={handleDeleteListing}
                        title="Delete listing"
                      >
                        <FaTrash />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className={styles.byInfo}>
            <div className={styles.authorImageWrapper}>
              {owner?.profile_picture ? (
                <Suspense fallback={<ImageSkeleton className={styles.authorImageWrapper} />}>
                  <Image 
                    src={profileImgSrc} 
                    alt={owner.username || "User"}
                    fill
                    className={styles.authorImage}
                    onError={handleProfileImgError}
                    //unoptimized={true}
                    priority // Above the fold - main listing image
                  />
                </Suspense>
              ) : (
                <FaUser size={24} color="#112D4E" className={styles.byIcon} />
              )}
            </div>
            <span className={styles.byText}>By {owner?.username || "User"}</span>
          </div>
        </div>

        {/* Fixed Image Section */}
        <div className={styles.imageWrapper}>
          <Suspense fallback={<ImageSkeleton className={styles.listingImage} />}>
            <Image
              src={displayImage}
              alt={listingData.title || "Listing image"}
              className={`${styles.listingImage} ${hasCustomImage ? styles.listingImageContain : styles.listingImageCover}`}
              onError={handleMainImgError}
              width={500}
              height={500}
              priority
            />
          </Suspense>
          
          {isOwner && isEditingListing && (
            <>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                hidden
              />
              <Button 
                className={styles.editImageButton}
                onClick={() => fileInputRef.current?.click()}
                title="Change image"
              >
                <FaPen />
              </Button>
              
              {hasCustomImage && (
                <Button 
                  className={styles.removeImageButton}
                  onClick={handleRemoveImage}
                  title="Remove image"
                >
                  <FaTrash />
                </Button>
              )}
            </>
          )}
        </div>

        <Accordion defaultActiveKey={["0"]} alwaysOpen>
          <Accordion.Item eventKey="0">
            <Accordion.Header>Description</Accordion.Header>
            <Accordion.Body>
              {isEditingListing ? (
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={editedData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className={styles.editField}
                />
              ) : (
                <p>{listingData.description}</p>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>Listing Type</Accordion.Header>
            <Accordion.Body>
              {isEditingListing ? (
                <Dropdown>
                  <Dropdown.Toggle variant="light" className={styles.sortSelect}>
                    {editedData.listingType}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className={styles.dropdownMenu}>
                    {listingTypeOptions.map((option) => (
                      <Dropdown.Item
                        key={option}
                        onClick={() => handleInputChange("listingType", option)}
                        active={editedData.listingType === option}
                        className={styles.dropdownItem}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <p>{listingData.listingType}</p>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1.5">
            <Accordion.Header>Category</Accordion.Header>
            <Accordion.Body>
              {isEditingListing ? (
                <Dropdown>
                  <Dropdown.Toggle variant="light" className={styles.sortSelect}>
                    {editedData.category}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className={styles.dropdownMenu}>
                    {categoryOptions.map((option) => (
                      <Dropdown.Item
                        key={option}
                        onClick={() => handleInputChange("category", option)}
                        active={editedData.category === option}
                        className={styles.dropdownItem}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <p>Category: {listingData.category}</p>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>Pricing</Accordion.Header>
            <Accordion.Body>
              {isEditingListing ? (
                <Form.Control
                  type="text"
                  value={editedData.pricing}
                  onChange={(e) => handleInputChange("pricing", e.target.value)}
                  className={styles.editField}
                />
              ) : (
                <p>{listingData.pricing}</p>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>Contact</Accordion.Header>
            <Accordion.Body>
              {owner ? (
                <p>
                  To contact about this listing, please reach out to {owner.username || "the owner"}
                  {owner.email && ` at ${owner.email}`}
                </p>
              ) : (
                <p>Contact information not available.</p>
              )}
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>Reviews</Accordion.Header>
            <Accordion.Body>
              <ReviewsSection listingId={listingId} userId={userId} />
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
        
        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          show={showDeleteModal}
          title="Delete Listing"
          message="Are you sure you want to delete this listing? This action cannot be undone."
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteListing}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </>
  );
};

export default Listing;