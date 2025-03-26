import { createClient } from "@/utils/supabase/client";
import { updateProfileField } from "@/lib/database";

const supabase = createClient();

/**
 * Uploads the profile picture to Supabase Storage and updates the profile URL in the database.
 * @param userId - The unique identifier of the user.
 * @param file - The selected image file.
 * @returns The uploaded image URL or an error message.
 */
export const uploadProfilePicture = async (
  userId: string,
  file: File
): Promise<{ imageUrl?: string; error?: string }> => {
  if (!userId || !file) {
    return { error: "Invalid user ID or file" };
  }

  // 1) Upload file to Supabase Storage
  const { data, error } = await supabase.storage
    .from("profile-pictures") // Ensure this bucket exists
    .upload(`user_${Date.now()}`, file, { upsert: true });

  if (error) {
    return { error: "Failed to upload profile picture: " + error.message };
  }

  // 2) Construct the public URL for the uploaded image
  const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-pictures/${data.path}`;

  // 3) Store the URL in the `profiles` table
  const { error: updateError } = await updateProfileField(userId, "profile_picture", imageUrl);

  if (updateError) {
    return { error: "Failed to update profile picture in database: " + updateError.message };
  }

  return { imageUrl };
};
