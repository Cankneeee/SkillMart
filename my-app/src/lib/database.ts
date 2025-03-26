import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

/**
 * Fetches a specific field from the user's profile by matching on 'email'.
 * Used before sign-up to check if the email is in use.
 *
 * @param email - The user's email string.
 * @param field - The profile field to retrieve (e.g., 'email').
 * @returns The value of the specified field, or null if no row matches.
 */
export const getProfileField = async (
  email: string,
  field: string
): Promise<any> => {
  // .maybeSingle() won't throw an error if 0 rows are found; data will be null.
  const { data, error } = await supabase
    .from("profiles")
    .select(field)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile field:", error);
    throw error;
  }

  // data === null if 0 rows returned
  if (!data) {
    console.warn("No matching profile found for that email.");
    return null;
  }

  console.log("Fetched data:", data);
  return (data as Record<string, any>)[field] ?? null;
};

/**
 * Fetches the entire user profile by matching on userId (the UUID in 'id').
 * @param userId - The unique identifier (UUID) from 'profiles.id'.
 * @returns The user's profile data, or null if none found.
 */
export const getUserProfile = async (
  userId: string
): Promise<Record<string, any> | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle(); // No error if 0 rows

  if (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }

  if (!data) {
    console.warn(`No profile found for userId = ${userId}`);
    return null;
  }

  return data;
};

/**
 * Updates the user's profile by matching on userId (UUID in 'id').
 * Logs each step for debugging purposes.
 *
 * @param userId - The user's UUID (id in 'profiles').
 * @param profileData - The fields to update.
 * @returns The updated profile data or null if no rows were updated.
 */
export const updateUserProfile = async (
  userId: string,
  profileData: {
    email?: string;
    username?: string;
    profile_picture?: string;
  }
): Promise<Record<string, any> | null> => {
  try {
    console.log("Attempting to update user profile...");
    console.log("User ID:", userId);
    console.log("Profile Data to Update:", profileData);

    // Ensure that the profile row exists before updating
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking for existing profile:", fetchError);
      throw fetchError;
    }

    if (!existingProfile) {
      console.warn(`No profile found for userId = ${userId}, inserting new profile...`);

      // Insert a new profile entry if none exists
      const { data: insertData, error: insertError } = await supabase
        .from("profiles")
        .insert([{ id: userId, ...profileData }])
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting new profile:", insertError);
        throw insertError;
      }

      console.log("Inserted new profile successfully:", insertData);
      return insertData;
    }

    // Proceed to update the existing profile
    const { data, error } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }

    console.log("Profile updated successfully:", data);
    return data;
  } catch (err) {
    console.error("Unexpected error in updateUserProfile:", err);
    throw err;
  }
};


type UpdateProfileFieldResult = {
  data?: any;
  error?: Error;
};

/**
 * Updates a specific field in the user's profile by matching on userId (the UUID in 'id').
 *
 * @param userId - The unique UUID for the user.
 * @param field - The profile field to update (e.g., 'username', 'profile_picture').
 * @param value - The new value for the field.
 * @returns The updated profile data, or null if no rows were updated.
 */
export async function updateProfileField(
  userId: string,
  fieldName: string,
  value: any
): Promise<UpdateProfileFieldResult> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ [fieldName]: value })
      .eq("id", userId);
      
    if (error) {
      return { error };
    }
    return { data };
  } catch (err: any) {
    return { error: err };
  }
}

// ------ LISTINGS RELATED FUNCTIONS ------

/**
 * Type definitions for the listings table
 */
export type Listing = {
  id: string;
  title: string;
  description: string;
  listing_type: 'Providing Skills' | 'Looking for Skills' | 'Trading Skills';
  category: string;
  price?: number;
  image_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateListingData = Omit<Listing, 'id' | 'created_at' | 'updated_at'>;
export type UpdateListingData = Partial<Omit<Listing, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

/**
 * Fetches all listings with optional filtering
 * @param listingType - Optional filter by listing type
 * @param category - Optional filter by category
 * @returns Array of listings matching the filters
 */
export const getListings = async (
  listingType?: string,
  category?: string
): Promise<Listing[]> => {
  try {
    let query = supabase.from('listings').select('*');
    
    if (listingType && listingType !== 'All Types') {
      query = query.eq('listing_type', listingType);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching listings:', error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error in getListings:', err);
    throw err;
  }
};

/**
 * Fetches listings created by a specific user
 * @param userId - The ID of the user who created the listings
 * @param listingType - Optional filter by listing type
 * @param category - Optional filter by category
 * @returns Array of user's listings matching the filters
 */
export const getUserListings = async (
  userId: string,
  listingType?: string,
  category?: string
): Promise<Listing[]> => {
  try {
    let query = supabase.from('listings').select('*').eq('user_id', userId);
    
    if (listingType && listingType !== 'All Types') {
      query = query.eq('listing_type', listingType);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user listings:', error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error in getUserListings:', err);
    throw err;
  }
};

/**
 * Fetches a single listing by ID
 * @param listingId - The ID of the listing to fetch
 * @returns The listing data or null if not found
 */
export const getListingById = async (
  listingId: string
): Promise<Listing | null> => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching listing by ID:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error in getListingById:', err);
    throw err;
  }
};

/**
 * Creates a new listing
 * @param listingData - The listing data to create
 * @returns The created listing data
 */
export const createListing = async (
  listingData: CreateListingData
): Promise<Listing> => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .insert([listingData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error in createListing:', err);
    throw err;
  }
};

/**
 * Updates an existing listing
 * @param listingId - The ID of the listing to update
 * @param userId - The ID of the user making the update (for authorization)
 * @param updateData - The listing data to update
 * @returns The updated listing data or null if not found/unauthorized
 */
export const updateListing = async (
  listingId: string,
  userId: string,
  updateData: UpdateListingData
): Promise<Listing | null> => {
  try {
    // First check if the listing belongs to the user
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching listing for update:', fetchError);
      throw fetchError;
    }
    
    if (!existingListing) {
      console.warn(`No listing found with ID ${listingId}`);
      return null;
    }
    
    if (existingListing.user_id !== userId) {
      console.warn(`User ${userId} is not authorized to update listing ${listingId}`);
      return null;
    }
    
    // Update the listing
    const { data, error } = await supabase
      .from('listings')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', listingId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error updating listing:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error in updateListing:', err);
    throw err;
  }
};

/**
 * Deletes a listing
 * @param listingId - The ID of the listing to delete
 * @param userId - The ID of the user making the deletion (for authorization)
 * @returns Boolean indicating success or failure
 */
export const deleteListing = async (
  listingId: string,
  userId: string
): Promise<boolean> => {
  try {
    // First check if the listing belongs to the user
    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching listing for deletion:', fetchError);
      throw fetchError;
    }
    
    if (!existingListing) {
      console.warn(`No listing found with ID ${listingId}`);
      return false;
    }
    
    if (existingListing.user_id !== userId) {
      console.warn(`User ${userId} is not authorized to delete listing ${listingId}`);
      return false;
    }
    
    // Delete the listing
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId);
    
    if (error) {
      console.error('Error deleting listing:', error);
      throw error;
    }
    
    return true;
  } catch (err) {
    console.error('Unexpected error in deleteListing:', err);
    throw err;
  }
};

/**
 * Searches listings by title, description, or user name
 * @param searchQuery - The search query string
 * @param listingType - Optional filter by listing type
 * @param category - Optional filter by category
 * @returns Array of listings matching the search query and filters
 */
export const searchListings = async (
  searchQuery: string,
  listingType?: string,
  category?: string
): Promise<Listing[]> => {
  try {
    let query = supabase
      .from('listings')
      .select(`
        *,
        profiles!listings_user_id_fkey (username)
      `)
      .or(`
        title.ilike.%${searchQuery}%,
        description.ilike.%${searchQuery}%,
        profiles.username.ilike.%${searchQuery}%
      `);
    
    if (listingType && listingType !== 'All Types') {
      query = query.eq('listing_type', listingType);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error searching listings:', error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error in searchListings:', err);
    throw err;
  }
};

// ------ REVIEWS RELATED FUNCTIONS ------

/**
 * Type definitions for the reviews table
 */
export type Review = {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at: string;
};

export type CreateReviewData = Omit<Review, 'id' | 'created_at' | 'updated_at'>;
export type UpdateReviewData = Pick<Review, 'rating' | 'comment'>;

/**
 * Fetches reviews for a specific listing
 * @param listingId - The ID of the listing to fetch reviews for
 * @returns Array of reviews for the listing
 */
export const getListingReviews = async (
  listingId: string
): Promise<(Review & { user_profile?: any })[]> => {
  try {
    // First check if the reviews table exists and has data
    const { count, error: countError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId);
    
    if (countError) {
      console.error('Error checking reviews table:', countError);
      // If there's an error with the table itself, return empty array
      return [];
    }
    
    // If there are no reviews, return empty array right away
    if (count === 0) {
      return [];
    }
    
    // Try a simpler query without the explicit foreign key constraint
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles(id, username, profile_picture)
        `)
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Transform the result to match the expected structure
      return (data || []).map(review => {
        const user_profile = review.profiles;
        delete review.profiles;
        return {
          ...review,
          user_profile
        };
      });
    } catch (joinError) {
      console.error('Error joining with profiles:', joinError);
      
      // Fallback to just getting reviews without profile info
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching reviews without profiles:', error);
        return [];
      }
      
      // Return reviews without profile info
      return data || [];
    }
  } catch (err) {
    console.error('Unexpected error in getListingReviews:', err);
    // Always return an empty array instead of throwing, to prevent UI breakage
    return [];
  }
};

/**
 * Calculates the average rating for a listing
 * @param listingId - The ID of the listing
 * @returns Average rating and review count
 */
export const getListingRating = async (
  listingId: string
): Promise<{ average: number; count: number }> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('listing_id', listingId);
    
    if (error) {
      console.error('Error fetching listing ratings:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return { average: 0, count: 0 };
    }
    
    const sum = data.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / data.length;
    
    return {
      average: parseFloat(average.toFixed(1)),
      count: data.length
    };
  } catch (err) {
    console.error('Unexpected error in getListingRating:', err);
    throw err;
  }
};

/**
 * Creates a new review for a listing
 * @param reviewData - The review data to create
 * @returns The created review data
 */
export const createReview = async (
  reviewData: CreateReviewData
): Promise<Review> => {
  try {
    // First check if the user has already reviewed this listing
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('id')
      .eq('listing_id', reviewData.listing_id)
      .eq('user_id', reviewData.user_id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error checking for existing review:', fetchError);
      throw fetchError;
    }
    
    if (existingReview) {
      throw new Error('You have already reviewed this listing');
    }
    
    // Check if the user is trying to review their own listing
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('user_id')
      .eq('id', reviewData.listing_id)
      .single();
    
    if (listingError) {
      console.error('Error fetching listing for review:', listingError);
      throw listingError;
    }
    
    if (listingData.user_id === reviewData.user_id) {
      throw new Error('You cannot review your own listing');
    }
    
    // Create the review
    const { data, error } = await supabase
      .from('reviews')
      .insert([reviewData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating review:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error in createReview:', err);
    throw err;
  }
};

/**
 * Updates an existing review
 * @param reviewId - The ID of the review to update
 * @param userId - The ID of the user making the update (for authorization)
 * @param updateData - The review data to update
 * @returns The updated review data or null if not found/unauthorized
 */
export const updateReview = async (
  reviewId: string,
  userId: string,
  updateData: UpdateReviewData
): Promise<Review | null> => {
  try {
    // First check if the review belongs to the user
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching review for update:', fetchError);
      throw fetchError;
    }
    
    if (!existingReview) {
      console.warn(`No review found with ID ${reviewId}`);
      return null;
    }
    
    if (existingReview.user_id !== userId) {
      console.warn(`User ${userId} is not authorized to update review ${reviewId}`);
      return null;
    }
    
    // Update the review
    const { data, error } = await supabase
      .from('reviews')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', reviewId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error updating review:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error in updateReview:', err);
    throw err;
  }
};

/**
 * Deletes a review
 * @param reviewId - The ID of the review to delete
 * @param userId - The ID of the user making the deletion (for authorization)
 * @returns Boolean indicating success or failure
 */
export const deleteReview = async (
  reviewId: string,
  userId: string
): Promise<boolean> => {
  try {
    // First check if the review belongs to the user
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', reviewId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching review for deletion:', fetchError);
      throw fetchError;
    }
    
    if (!existingReview) {
      console.warn(`No review found with ID ${reviewId}`);
      return false;
    }
    
    if (existingReview.user_id !== userId) {
      console.warn(`User ${userId} is not authorized to delete review ${reviewId}`);
      return false;
    }
    
    // Delete the review
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);
    
    if (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
    
    return true;
  } catch (err) {
    console.error('Unexpected error in deleteReview:', err);
    throw err;
  }
};

// ------ SAVED LISTINGS RELATED FUNCTIONS ------

/**
 * Type definition for the saved_listings table
 */
export type SavedListing = {
  id: string;
  user_id: string;
  listing_id: string;
  saved_at: string;
};

/**
 * Fetches saved listings for a user
 * @param userId - The ID of the user
 * @param listingType - Optional filter by listing type
 * @param category - Optional filter by category
 * @returns Array of saved listings with full listing details
 */
export const getUserSavedListings = async (
  userId: string,
  listingType?: string,
  category?: string
): Promise<(SavedListing & { listing: Listing })[]> => {
  try {
    let query = supabase
      .from('saved_listings')
      .select(`
        *,
        listing:listings!saved_listings_listing_id_fkey (*)
      `)
      .eq('user_id', userId);
    
    if (listingType && listingType !== 'All Types') {
      query = query.eq('listing.listing_type', listingType);
    }
    
    if (category) {
      query = query.eq('listing.category', category);
    }
    
    const { data, error } = await query.order('saved_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching saved listings:', error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error in getUserSavedListings:', err);
    throw err;
  }
};

/**
 * Saves a listing for a user
 * @param userId - The ID of the user
 * @param listingId - The ID of the listing to save
 * @returns The saved listing data
 */
export const saveListing = async (
  userId: string,
  listingId: string
): Promise<SavedListing> => {
  try {
    // Check if the listing is already saved
    const { data: existingSaved, error: fetchError } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error checking for existing saved listing:', fetchError);
      throw fetchError;
    }
    
    if (existingSaved) {
      throw new Error('This listing is already saved');
    }

    // Save the listing
    const { data, error } = await supabase
    .from('saved_listings')
    .insert([{ user_id: userId, listing_id: listingId }])
    .select()
    .single();

    if (error) {
    console.error('Error saving listing:', error);
    throw error;
    }

    return data;
    } catch (err) {
    console.error('Unexpected error in saveListing:', err);
    throw err;
    }
    };

    /**
    * Unsaves a listing for a user
    * @param userId - The ID of the user
    * @param listingId - The ID of the listing to unsave
    * @returns Boolean indicating success or failure
    */
    export const unsaveListing = async (
    userId: string,
    listingId: string
    ): Promise<boolean> => {
    try {
    const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);

    if (error) {
    console.error('Error unsaving listing:', error);
    throw error;
    }

    return true;
    } catch (err) {
    console.error('Unexpected error in unsaveListing:', err);
    throw err;
    }
    };

    /**
    * Checks if a listing is saved by a user
    * @param userId - The ID of the user
    * @param listingId - The ID of the listing
    * @returns Boolean indicating if the listing is saved
    */
    export const isListingSaved = async (
    userId: string,
    listingId: string
    ): Promise<boolean> => {
    try {
    const { data, error } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();

    if (error) {
    console.error('Error checking if listing is saved:', error);
    throw error;
    }

    return !!data;
    } catch (err) {
    console.error('Unexpected error in isListingSaved:', err);
    throw err;
    }
    };

    // ------ STORAGE/IMAGES RELATED FUNCTIONS ------

    /**
    * Uploads an image to the listing-images bucket
    * @param userId - The ID of the user uploading the image
    * @param file - The file to upload
    * @param listingId - Optional listing ID to include in the path
    * @returns The URL of the uploaded image
    */
    export const uploadListingImage = async (
    userId: string,
    file: File,
    listingId?: string
    ): Promise<string> => {
    try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    // Define the path where the file will be stored
    const filePath = listingId
    ? `${userId}/${listingId}/${fileName}`
    : `${userId}/${fileName}`;

    // Upload the file
    const { error } = await supabase.storage
    .from('listing-images')
    .upload(filePath, file);

    if (error) {
    console.error('Error uploading image:', error);
    throw error;
    }

    // Get the public URL
    const { data } = supabase.storage
    .from('listing-images')
    .getPublicUrl(filePath);

    return data.publicUrl;
    } catch (err) {
    console.error('Unexpected error in uploadListingImage:', err);
    throw err;
    }
    };

    /**
    * Deletes an image from the listing-images bucket
    * @param userId - The ID of the user deleting the image
    * @param imageUrl - The URL of the image to delete
    * @returns Boolean indicating success or failure
    */
    export const deleteListingImage = async (
    userId: string,
    imageUrl: string
    ): Promise<boolean> => {
    try {
    // Extract the path from the URL
    const urlParts = imageUrl.split('listing-images/');
    if (urlParts.length < 2) {
    throw new Error('Invalid image URL');
    }

    const path = urlParts[1];

    // Extract the user ID from the path to verify ownership
    const pathParts = path.split('/');
    if (pathParts[0] !== userId) {
    throw new Error('You do not have permission to delete this image');
    }

    // Delete the file
    const { error } = await supabase.storage
    .from('listing-images')
    .remove([path]);

    if (error) {
    console.error('Error deleting image:', error);
    throw error;
    }

    return true;
    } catch (err) {
    console.error('Unexpected error in deleteListingImage:', err);
    throw err;
    }
    };

    // ------ CATEGORIES AND LISTING TYPES ------

    /**
    * Returns the available listing categories
    */
    export const getCategories = (): string[] => {
    return [
    "Business", 
    "Finance & Accounting", 
    "IT & Software", 
    "Office Productivity", 
    "Personal Development", 
    "Design", 
    "Art", 
    "Marketing", 
    "Lifestyle", 
    "Photography & Video", 
    "Health & Fitness", 
    "Music", 
    "Sports", 
    "Teaching & Academics"
    ];
    };

    /**
    * Returns the available listing types
    */
    export const getListingTypes = (): string[] => {
    return ["All Types", "Providing Skills", "Looking for Skills", "Trading Skills"];
    };

    /**
    * Returns the category mapping for URL encoding/decoding
    */
    export const getCategoryMapping = (): Record<string, string> => {
    return {
    "business": "Business", 
    "finance-accounting": "Finance & Accounting", 
    "it-software": "IT & Software", 
    "office-productivity": "Office Productivity", 
    "personal-development": "Personal Development", 
    "design": "Design", 
    "art": "Art", 
    "marketing": "Marketing", 
    "lifestyle": "Lifestyle", 
    "photography-video": "Photography & Video", 
    "health-fitness": "Health & Fitness", 
    "music": "Music", 
    "sports": "Sports", 
    "teaching-academics": "Teaching & Academics"
    };
    };

    /**
    * Converts a category name to a URL-friendly slug
    * @param category - The category name
    * @returns The URL-friendly slug
    */
    export const encodeCategory = (category: string): string => {
    return category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '-');
    };

    /**
    * Converts a URL-friendly slug back to a category name
    * @param encodedCategory - The URL-friendly slug
    * @returns The original category name or undefined if not found
    */
    export const decodeCategoryFromSlug = (slug: string): string | undefined => {
    const categoryMapping = getCategoryMapping();
    return categoryMapping[slug];
    };