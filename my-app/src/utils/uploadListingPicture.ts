import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

/**
 * Uploads the listing picture to Supabase Storage and returns the public URL.
 * @param userId - The unique identifier of the user.
 * @param file - The selected image file.
 * @param listingId - Optional listing ID for organizing storage.
 * @returns The uploaded image URL or an error message.
 */
export const uploadListingPicture = async (
  userId: string,
  file: File,
  listingId?: string
): Promise<{ imageUrl?: string; error?: string }> => {
  if (!userId || !file) {
    return { error: "Invalid user ID or file" };
  }

  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    // Define the path where the file will be stored
    const filePath = listingId
      ? `${userId}/${listingId}/${fileName}`
      : `${userId}/${fileName}`;

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from("listing-images") // Make sure this bucket exists
      .upload(filePath, file, { upsert: true });

    if (error) {
      return { error: "Failed to upload listing picture: " + error.message };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(filePath);

    return { imageUrl: urlData.publicUrl };
  } catch (err: any) {
    return { error: "An unexpected error occurred: " + err.message };
  }
};