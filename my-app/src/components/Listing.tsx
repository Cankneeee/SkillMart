// src/components/Listing.tsx
"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { Accordion, Button, Form, Dropdown } from "react-bootstrap";
import Image from "next/image";
import Head from "next/head";
import ImageSkeleton from "./ImageSkeleton";
import { FaUser, FaPen, FaTrash, FaCheck, FaTimes, FaBookmark } from "react-icons/fa";
import { useRouter } from "next/navigation";
import ReviewsSection from "./ReviewsSection";
import ConfirmationModal from "./ConfirmationModal";
// Import the CSS Module
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
import { useAuth } from "@/context/AuthContext";
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
  const { user: authUser, loading: authLoading } = useAuth();

  // State
  const [listing, setListing] = useState<ListingType | null>(null);
  const [owner, setOwner] = useState<any>(null);
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
    contact: { email: "", phone: "" },
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
  // Check if using a custom image
  const hasCustomImage = editedData.image !== DEFAULT_LISTING_IMAGE;
  // Get categories and listing types
  const categoryOptions = getCategories();
  const listingTypeOptions = getListingTypes().filter(type => type !== "All Types");

  // Meta content functions
  const getMetaDescription = () => {
    if (!listing?.description) return "Find skills and services on SkillMart";
    return listing.description.length > 160 ? `${listing.description.substring(0, 157)}...` : listing.description;
  };
  const getCanonicalUrl = () => {
    if (typeof window === 'undefined') return `https://skillmart.com/listing/${listingId}`;
    return `${window.location.origin}/listing/${listingId}`;
  };
   const getJsonLd = () => {
     if (!listing) return "{}";
     const structuredData: any = { "@context": "https://schema.org", "@type": "Service", "name": listing.title, "description": listing.description, "image": listing.image_url || DEFAULT_LISTING_IMAGE, "offers": { "@type": "Offer", "price": listing.price ? listing.price.toString() : "Contact for pricing", "priceCurrency": "USD" }, "provider": { "@type": "Person", "name": owner?.username || "SkillMart User" } };
     return JSON.stringify(structuredData);
   };


  // Fetch listing data
  const fetchListingData = useCallback(async () => {
      if (authLoading) return;
      setIsLoading(true);
      setHasError(false);
      try {
          const { data: fetchedListing, error: listingError } = await listingApi.getListingById(listingId);
          if (listingError || !fetchedListing) { throw new Error(listingError || "Listing not found"); }
          setListing(fetchedListing);

          if (authUser && fetchedListing.user_id === authUser.id) setIsOwner(true); else setIsOwner(false);

          const { data: ownerProfile } = await userApi.getProfile(fetchedListing.user_id);
          setOwner(ownerProfile || { username: "Unknown User" });

          if (authUser) {
              const { data: isSavedStatus } = await savedListingApi.isListingSaved(authUser.id, listingId);
              setIsSaved(isSavedStatus || false);
          } else { setIsSaved(false); }

          const newListingData = { title: fetchedListing.title, description: fetchedListing.description, listingType: fetchedListing.listing_type, category: fetchedListing.category, pricing: fetchedListing.price ? fetchedListing.price.toString() : "", image: fetchedListing.image_url || DEFAULT_LISTING_IMAGE, contact: { email: "", phone: "" }, };
          setListingData(newListingData);
          setEditedData(newListingData);
      } catch (error: any) {
          console.error("Error fetching listing data:", error);
          setHasError(true);
          setErrorMessage(error?.message || "Failed to load listing data");
          // Optionally redirect on critical fetch errors after initial load attempt
          // if (!isLoading) router.push("/not-found");
      } finally {
          setIsLoading(false);
      }
  }, [listingId, authUser, authLoading, router]); // Removed 'isLoading' from deps

  useEffect(() => {
      if (listingId) { fetchListingData(); }
      else { setIsLoading(false); setHasError(true); setErrorMessage("No listing ID provided"); }
  }, [listingId, fetchListingData]);


  // Handle bookmark listing
  const handleBookmarkListing = async () => {
    if (!authUser) { router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); return; }
    const currentUserId = authUser.id;
    try {
      if (isSaved) {
        const { error } = await savedListingApi.unsaveListing(currentUserId, listingId);
        if (error) throw new Error(error); setIsSaved(false);
      } else {
        const { error } = await savedListingApi.saveListing(currentUserId, listingId);
        if (error) throw new Error(error); setIsSaved(true);
      }
    } catch (error: any) { console.error("Error toggling bookmark:", error); }
  };

  // Handle edit listing
  const handleEditListing = () => { if (!isOwner) return; setEditedData({ ...listingData }); setIsEditingListing(true); };

  // Handle save listing changes
  const handleSaveListing = async () => {
    if (!isOwner || !authUser || !listing) return; const currentUserId = authUser.id;
    try {
      let image_url = editedData.image;
      if (hasCustomImage && uploadedFile) {
        const { imageUrl, error } = await uploadListingPicture(currentUserId, uploadedFile);
        if (error) { console.error("Error uploading image:", error); } else if (imageUrl) { image_url = imageUrl; }
      }
      const updatedData = { title: editedData.title, description: editedData.description, listing_type: editedData.listingType as any, category: editedData.category, price: editedData.pricing ? parseFloat(editedData.pricing) : undefined, image_url: image_url !== DEFAULT_LISTING_IMAGE ? image_url : undefined };
      const { data: updatedListing, error } = await listingApi.updateListing( listingId, currentUserId, updatedData );
      if (error) throw new Error(error);
      if (updatedListing) { setListing(updatedListing); const updatedLData = { ...editedData, image: image_url }; setListingData(updatedLData); setIsEditingListing(false); setUploadedFile(null); }
    } catch (error: any) { console.error("Error updating listing:", error); }
  };

  // Handle discard changes
  const handleDiscardChanges = () => { setEditedData({ ...listingData }); setIsEditingListing(false); setUploadedFile(null); };

  // Handle delete listing
  const handleDeleteListing = () => { if (!isOwner) return; setShowDeleteModal(true); };

  // Confirm delete listing
  const confirmDeleteListing = async () => {
    if (!isOwner || !authUser) return; const currentUserId = authUser.id;
    try {
      const { data: success, error } = await listingApi.deleteListing(listingId, currentUserId);
      if (error) throw new Error(error);
      if (success) { setShowDeleteModal(false); router.push("/my-listings"); }
      else { console.error("Failed to delete listing"); }
    } catch (error: any) { console.error("Error deleting listing:", error.message); }
  };

  // Handle input change
  const handleInputChange = (field: string, value: string) => { setEditedData((prev) => { if (field === "email" || field === "phone") return { ...prev, contact: { ...prev.contact, [field]: value } }; return { ...prev, [field]: value }; }); };

  // Handle image change
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => { if (!isOwner) return; const file = event.target.files?.[0]; if (!file) return; setUploadedFile(file); const imageUrl = URL.createObjectURL(file); setEditedData(prev => ({ ...prev, image: imageUrl })); };

  // Handle removing image
  const handleRemoveImage = () => { if (!isOwner) return; setEditedData(prev => ({ ...prev, image: DEFAULT_LISTING_IMAGE })); setUploadedFile(null); };

  // --- Render Logic ---
  if (authLoading || isLoading) { return ( <><Head><title>Loading Listing | SkillMart</title></Head><div className={styles.pageContainer}><p className="text-center my-5">Loading listing...</p></div></> ); }
  if (hasError) { return ( <><Head><title>Error | SkillMart</title></Head><div className={styles.pageContainer}><p className="text-center my-5 text-danger">Error loading listing: {errorMessage}</p><div className="text-center"><Button onClick={() => router.push('/')}>Return to Home</Button></div></div></> ); }
  if (!listing) { return ( <><Head><title>Listing Not Found | SkillMart</title></Head><div className={styles.pageContainer}><p className="text-center my-5">Listing not found</p><div className="text-center"><Button onClick={() => router.push('/')}>Return to Home</Button></div></div></> ); }

  return (
    <>
      <Head>
        <title>{listingData.title} | SkillMart</title>
        <meta name="description" content={getMetaDescription()} />
        <meta property="og:title" content={`${listingData.title} | SkillMart`} />
        <meta property="og:description" content={getMetaDescription()} />
        <meta property="og:image" content={listingData.image !== DEFAULT_LISTING_IMAGE ? listingData.image : "https://skillmart.com/default-social-image.jpg"} />
        <meta property="og:url" content={getCanonicalUrl()} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${listingData.title} | SkillMart`} />
        <meta name="twitter:description" content={getMetaDescription()} />
        <meta name="twitter:image" content={listingData.image !== DEFAULT_LISTING_IMAGE ? listingData.image : "https://skillmart.com/default-social-image.jpg"} />
        <link rel="canonical" href={getCanonicalUrl()} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: getJsonLd() }} />
        <meta name="keywords" content={`skills, ${listingData.category}, ${listingData.listingType}, marketplace`} />
      </Head>

      <div className={styles.pageContainer}>
        <div className={styles.listingHeader}>
          <div className={styles.titleRow}>
            {isEditingListing ? ( <Form.Control type="text" value={editedData.title} onChange={(e) => handleInputChange("title", e.target.value)} className={styles.titleInput} /> ) : ( <h1 className={styles.title}>{listingData.title}</h1> )}
            <div className={styles.actionButtons}>
              {isEditingListing ? (
                <> <Button className={styles.actionButton} onClick={handleSaveListing} title="Save changes"><FaCheck /></Button> <Button className={styles.actionButton} onClick={handleDiscardChanges} title="Discard changes"><FaTimes /></Button> </>
              ) : (
                <>
                  {!authLoading && authUser && ( <Button className={styles.actionButton} onClick={handleBookmarkListing} title={isSaved ? "Remove bookmark" : "Bookmark listing"}> <FaBookmark color={isSaved ? "#7E57C2" : undefined} /> </Button> )}
                  {isOwner && ( <> <Button className={styles.actionButton} onClick={handleEditListing} title="Edit listing"><FaPen /></Button> <Button className={styles.actionButton} onClick={handleDeleteListing} title="Delete listing"><FaTrash /></Button> </> )}
                </>
              )}
            </div>
          </div>
          <div className={styles.byInfo}>
            <div className={styles.authorImageWrapper}>
              {owner?.profile_picture ? ( <Suspense fallback={<ImageSkeleton className={styles.authorImageWrapper} />}><Image src={profileImgSrc} alt={owner.username || "User"} fill className={styles.authorImage} onError={handleProfileImgError} priority /></Suspense> ) : ( <FaUser size={24} color="#112D4E" className={styles.byIcon} /> )}
            </div>
            <span className={styles.byText}>By {owner?.username || "User"}</span>
          </div>
        </div>

        <div className={styles.imageWrapper}>
          <Suspense fallback={<ImageSkeleton className={styles.listingImage} />}>
            <Image src={displayImage} alt={listingData.title || "Listing image"} className={`${styles.listingImage} ${hasCustomImage ? styles.listingImageContain : styles.listingImageCover}`} onError={handleMainImgError} width={500} height={500} priority />
          </Suspense>
          {isOwner && isEditingListing && ( <> <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} hidden /> <Button className={styles.editImageButton} onClick={() => fileInputRef.current?.click()} title="Change image"><FaPen /></Button> {hasCustomImage && ( <Button className={styles.removeImageButton} onClick={handleRemoveImage} title="Remove image"><FaTrash /></Button> )} </> )}
        </div>

        {/* *** WRAPPER DIV ADDED *** */}
        <div className={styles.accordionWrapper}>
          <Accordion defaultActiveKey={["0"]} alwaysOpen>
            <Accordion.Item eventKey="0">
              <Accordion.Header>Description</Accordion.Header>
              <Accordion.Body>{isEditingListing ? ( <Form.Control as="textarea" rows={4} value={editedData.description} onChange={(e) => handleInputChange("description", e.target.value)} className={styles.editField} /> ) : ( <p>{listingData.description}</p> )}</Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1">
               <Accordion.Header>Listing Type</Accordion.Header>
               <Accordion.Body>{isEditingListing ? ( <Dropdown><Dropdown.Toggle variant="light" className={styles.sortSelect}>{editedData.listingType}</Dropdown.Toggle><Dropdown.Menu className={styles.dropdownMenu}>{listingTypeOptions.map((option) => ( <Dropdown.Item key={option} onClick={() => handleInputChange("listingType", option)} active={editedData.listingType === option} className={styles.dropdownItem}>{option}</Dropdown.Item> ))}</Dropdown.Menu></Dropdown> ) : ( <p>{listingData.listingType}</p> )}</Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1.5">
              <Accordion.Header>Category</Accordion.Header>
              <Accordion.Body>{isEditingListing ? ( <Dropdown><Dropdown.Toggle variant="light" className={styles.sortSelect}>{editedData.category}</Dropdown.Toggle><Dropdown.Menu className={styles.dropdownMenu}>{categoryOptions.map((option) => ( <Dropdown.Item key={option} onClick={() => handleInputChange("category", option)} active={editedData.category === option} className={styles.dropdownItem}>{option}</Dropdown.Item> ))}</Dropdown.Menu></Dropdown> ) : ( <p>Category: {listingData.category}</p> )}</Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="2">
              <Accordion.Header>Pricing</Accordion.Header>
              <Accordion.Body>{isEditingListing ? ( <Form.Control type="text" value={editedData.pricing} onChange={(e) => handleInputChange("pricing", e.target.value)} className={styles.editField} /> ) : ( <p>{listingData.pricing || "Contact for details"}</p> )}</Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="3">
              <Accordion.Header>Contact</Accordion.Header>
              <Accordion.Body>{owner ? ( <p>To contact about this listing, please reach out to {owner.username || "the owner"} {owner.email && ` at ${owner.email}`}</p> ) : ( <p>Contact information not available.</p> )}</Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="4">
              <Accordion.Header>Reviews</Accordion.Header>
              <Accordion.Body><ReviewsSection listingId={listingId} userId={authUser?.id || null} /></Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </div>
         {/* *** END WRAPPER DIV *** */}


        <ConfirmationModal show={showDeleteModal} title="Delete Listing" message="Are you sure you want to delete this listing? This action cannot be undone." onCancel={() => setShowDeleteModal(false)} onConfirm={confirmDeleteListing} confirmText="Delete" cancelText="Cancel" variant="danger" />
      </div>
    </>
  );
};

export default Listing;