// src/components/ListingCreationForm.tsx
"use client";

import { useState, useRef, Suspense } from "react";
import { Form, Button, Container, Row, Col, Image, Card, Dropdown } from "react-bootstrap";
import { FaUser, FaPen, FaCheck, FaTimes, FaTrash } from "react-icons/fa";
import { useRouter } from "next/navigation";
import styles from "@/styles/ListingCreationForm.module.css";
import ImageSkeleton from "./ImageSkeleton";
import { createClient } from "@/utils/supabase/client";
import { createListing, getCategories, getListingTypes } from "@/lib/database";
import {
  DEFAULT_LISTING_IMAGE,
  useImageUpload,
  uploadListingPicture
} from "@/utils/imageUtils";

// Define interface for listing data state
interface ListingData {
  title: string;
  description: string;
  listingType: string;
  category: string;
  pricing: string;
  contact: {
    email: string;
    phone: string;
  };
}

// Define interface for form errors
interface FormErrors {
  title?: string;
  description?: string;
  pricing?: string;
  contactEmail?: string;
  contactPhone?: string;
  image?: string;
  form?: string;
}

const ListingCreationForm: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = createClient();

  // Use the image upload hook
  const {
    image,
    uploadedFile,
    isCustomImage,
    error: imageError,
    setError: setImageError,
    handleImageChange,
    resetImage
  } = useImageUpload('', DEFAULT_LISTING_IMAGE);

  // Listing data state with default values
  const [listingData, setListingData] = useState<ListingData>({
    title: "",
    description: "",
    listingType: "Providing Skills", // Default value
    category: "Business", // Default value
    pricing: "",
    contact: {
      email: "",
      phone: "",
    },
  });

  // Get categories and listing types from database utility functions
  const categoryOptions = getCategories();
  const listingTypeOptions = getListingTypes().filter(type => type !== "All Types");

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle change in form inputs
  const handleInputChange = (field: string, value: string) => {
    if (field === "email" || field === "phone") {
      setListingData(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          [field]: value,
        },
      }));

      // Clear error for this contact field
      const errorKey = `contact${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof FormErrors;
      if (errors[errorKey]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    } else {
      setListingData(prev => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      if (errors[field as keyof FormErrors]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof FormErrors];
          return newErrors;
        });
      }
    }
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    handleImageChange(file); // Use the hook's handler

    // Clear image error if there was one
    if (errors.image) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.image;
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!listingData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!listingData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!listingData.pricing.trim()) {
      newErrors.pricing = "Pricing is required";
    }

    if (!listingData.contact.email.trim()) {
      newErrors.contactEmail = "Email is required";
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(listingData.contact.email)) {
        newErrors.contactEmail = "Please enter a valid email address";
      }
    }

    if (!listingData.contact.phone.trim()) {
      newErrors.contactPhone = "Phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Check authentication status using getUser() for server verification
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrors({ form: "You must be logged in to create a listing. Please log in and try again." });
        setIsSubmitting(false); // Ensure loading state is reset
        // Optionally redirect to login
        // router.push('/login');
        return;
      }

      // Upload image if custom image exists
      let image_url = DEFAULT_LISTING_IMAGE; // Start with default
      if (isCustomImage && uploadedFile) {
        const { imageUrl: uploadedImageUrl, error: uploadError } = await uploadListingPicture(
          user.id,
          uploadedFile
        );

        if (uploadError) {
          setErrors({ image: uploadError });
          // Decide if you want to stop submission on image upload failure
          // For now, we'll proceed but log the error
          console.error("Image upload failed:", uploadError);
          // Optionally, you could set image_url back to default or handle differently
          // image_url = DEFAULT_LISTING_IMAGE;
        } else if (uploadedImageUrl) {
          image_url = uploadedImageUrl; // Use the uploaded image URL
        }
      }

      // Prepare the data for database insertion using the createListing function
      const newListingData = {
        title: listingData.title,
        description: listingData.description,
        listing_type: listingData.listingType as 'Providing Skills' | 'Looking for Skills' | 'Trading Skills',
        category: listingData.category,
        price: listingData.pricing ? parseFloat(listingData.pricing) : undefined,
        // *** FIXED LINE: Use undefined instead of null ***
        image_url: image_url === DEFAULT_LISTING_IMAGE ? undefined : image_url,
        user_id: user.id, // Use the verified user ID
      };

      // Create the listing using the database utility function
      const listing = await createListing(newListingData); // Error should be resolved

      console.log("Listing created successfully:", listing);

      // Redirect to the user's listings page after successful creation
      router.push("/my-listings");

    } catch (error: any) {
      console.error("Error creating listing:", error);
      setErrors({ form: error.message || "An error occurred while creating your listing. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };


  // Handle cancel
  const handleCancel = () => {
    router.push("/my-listings"); // Navigate back or to a relevant page
  };

  return (
    <div className={styles.pageContainer}>
      <Container className={styles.container}>
        <h1 className={styles.pageTitle}>Create New Listing</h1>

        <Form onSubmit={handleSubmit}>
          <Card className={styles.formCard}>
            <Card.Body>
              {/* Title */}
              <Form.Group className="mb-4">
                <Form.Label className={styles.formLabel}>Title</Form.Label>
                <Form.Control
                  type="text"
                  value={listingData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className={`${styles.formInput} ${errors.title ? styles.inputError : ""}`}
                  placeholder="Enter a descriptive title for your listing"
                  disabled={isSubmitting}
                />
                {errors.title && <div className={styles.errorText}>{errors.title}</div>}
              </Form.Group>

              {/* Image Upload */}
              <Form.Group className="mb-4">
                <Form.Label className={styles.formLabel}>Listing Image</Form.Label>
                <div className={styles.imageUploadContainer}>
                  <Suspense fallback={<ImageSkeleton className={styles.previewImage} />}>
                    <Image
                      src={image} // Use the image state from the hook
                      alt="Listing preview"
                      className={styles.previewImage}
                      width={150} // Example size, adjust as needed
                      height={150}
                    />
                  </Suspense>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    hidden
                    disabled={isSubmitting}
                  />
                  <Button
                    className={styles.editImageButton}
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload image"
                    disabled={isSubmitting}
                  >
                    <FaPen />
                  </Button>

                  {isCustomImage && (
                    <Button
                      className={styles.removeImageButton}
                      onClick={resetImage} // Use the hook's reset function
                      title="Remove image"
                      disabled={isSubmitting}
                    >
                      <FaTrash />
                    </Button>
                  )}
                </div>
                {errors.image && <div className={styles.errorText}>{errors.image}</div>}
                {imageError && <div className={styles.errorText}>{imageError}</div>}
              </Form.Group>

              {/* Description */}
              <Form.Group className="mb-4">
                <Form.Label className={styles.formLabel}>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={listingData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className={`${styles.formInput} ${errors.description ? styles.inputError : ""}`}
                  placeholder="Provide detailed information about your listing"
                  disabled={isSubmitting}
                />
                {errors.description && <div className={styles.errorText}>{errors.description}</div>}
              </Form.Group>

              {/* Listing Type */}
              <Form.Group className="mb-4">
                <Form.Label className={styles.formLabel}>Listing Type</Form.Label>
                <Dropdown className={styles.dropdownContainer}>
                  <Dropdown.Toggle variant="light" className={styles.dropdownToggle} disabled={isSubmitting}>
                    {listingData.listingType}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className={styles.dropdownMenu}>
                    {listingTypeOptions.map((option) => (
                      <Dropdown.Item
                        key={option}
                        onClick={() => handleInputChange("listingType", option)}
                        active={listingData.listingType === option}
                        className={styles.dropdownItem}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </Form.Group>

              {/* Category */}
              <Form.Group className="mb-4">
                <Form.Label className={styles.formLabel}>Category</Form.Label>
                <Dropdown className={styles.dropdownContainer}>
                  <Dropdown.Toggle variant="light" className={styles.dropdownToggle} disabled={isSubmitting}>
                    {listingData.category}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className={styles.dropdownMenu}>
                    {categoryOptions.map((option) => (
                      <Dropdown.Item
                        key={option}
                        onClick={() => handleInputChange("category", option)}
                        active={listingData.category === option}
                        className={styles.dropdownItem}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </Form.Group>

              {/* Pricing */}
              <Form.Group className="mb-4">
                <Form.Label className={styles.formLabel}>Pricing</Form.Label>
                <Form.Control
                  type="text" // Keep as text to allow ranges/descriptions
                  value={listingData.pricing}
                  onChange={(e) => handleInputChange("pricing", e.target.value)}
                  className={`${styles.formInput} ${errors.pricing ? styles.inputError : ""}`}
                  placeholder="E.g., $50 per hour, $200-$500 per project, Free"
                  disabled={isSubmitting}
                />
                {errors.pricing && <div className={styles.errorText}>{errors.pricing}</div>}
              </Form.Group>

              {/* Contact Information */}
              <Form.Group className="mb-4">
                <Form.Label className={styles.formLabel}>Contact Information (For SkillMart Use)</Form.Label>
                <p className={styles.contactInfoNote}>This information helps us connect users but may not be publicly displayed on the listing itself.</p>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={listingData.contact.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`${styles.formInput} ${errors.contactEmail ? styles.inputError : ""}`}
                    placeholder="Enter your contact email"
                    disabled={isSubmitting}
                  />
                  {errors.contactEmail && <div className={styles.errorText}>{errors.contactEmail}</div>}
                </Form.Group>

                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="text"
                    value={listingData.contact.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`${styles.formInput} ${errors.contactPhone ? styles.inputError : ""}`}
                    placeholder="Enter your contact phone number"
                    disabled={isSubmitting}
                  />
                  {errors.contactPhone && <div className={styles.errorText}>{errors.contactPhone}</div>}
                </Form.Group>
              </Form.Group>

              {/* General form error message */}
              {errors.form && <div className={`${styles.errorText} mt-3`}>{errors.form}</div>}
            </Card.Body>
          </Card>

          <div className={styles.buttonContainer}>
            <Button
              variant="secondary"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Listing"}
            </Button>
          </div>
        </Form>
      </Container>
    </div>
  );
};

export default ListingCreationForm;
