// utils/imageUtils.ts
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

// Constants for default/fallback images
export const DEFAULT_PROFILE_IMAGE = '/default-profile.png';
export const DEFAULT_LISTING_IMAGE = '/listing-default-photo.png';

/**
 * Upload an image to Supabase storage
 * @param bucket The storage bucket name
 * @param path The path within the bucket
 * @param file The file to upload
 * @param userId The user ID for permissions check
 */
export const uploadImageToStorage = async (
  bucket: string,
  path: string,
  file: File,
  userId: string
): Promise<{ imageUrl: string | null; error: string | null }> => {
  try {
    const supabase = createClient();
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return { imageUrl: null, error: error.message };
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    
    return { imageUrl: urlData.publicUrl, error: null };
  } catch (error: any) {
    console.error('Unexpected error during image upload:', error);
    return { imageUrl: null, error: error.message || 'Failed to upload image' };
  }
};

/**
 * Upload a profile picture
 * @param userId The user ID
 * @param file The image file
 */
export const uploadProfilePicture = async (userId: string, file: File) => {
  return uploadImageToStorage('profile-pictures', 'public', file, userId);
};

/**
 * Upload a listing picture
 * @param userId The user ID
 * @param file The image file
 */
export const uploadListingPicture = async (userId: string, file: File) => {
  return uploadImageToStorage('listing-images', 'public', file, userId);
};

/**
 * Custom hook to handle image with error fallback
 * @param src The image source URL
 * @param fallbackSrc The fallback image URL
 */
export const useImageWithFallback = (src: string, fallbackSrc: string) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  
  useEffect(() => {
    setImgSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);
  
  const onError = () => {
    setImgSrc(fallbackSrc);
  };
  
  return { imgSrc, onError };
};

/**
 * Generates a preview URL for a file
 * @param file The file to preview
 */
export const getFilePreviewUrl = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revokes a preview URL to prevent memory leaks
 * @param previewUrl The preview URL to revoke
 */
export const revokePreviewUrl = (previewUrl: string): void => {
  URL.revokeObjectURL(previewUrl);
};

/**
 * Clean up function for image previews to prevent memory leaks
 * Should be called in useEffect cleanup
 * @param urls Array of preview URLs to revoke
 */
export const cleanupImagePreviews = (urls: string[]): void => {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
};

/**
 * Hook to manage image upload state
 */
export const useImageUpload = (initialImage = '', defaultImage = '') => {
  const [image, setImage] = useState(initialImage || defaultImage);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isCustomImage, setIsCustomImage] = useState(!!initialImage && initialImage !== defaultImage);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  // Update state when initialImage changes
  useEffect(() => {
    setImage(initialImage || defaultImage);
    setIsCustomImage(!!initialImage && initialImage !== defaultImage);
  }, [initialImage, defaultImage]);
  
  const handleImageChange = (file: File | null) => {
    // Clean up previous preview if exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    if (!file) {
      setUploadedFile(null);
      setPreviewUrl(null);
      setImage(defaultImage);
      setIsCustomImage(false);
      return;
    }
    
    // Validate file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      setError('Only images are allowed');
      return;
    }
    
    // Validate file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    const newPreviewUrl = URL.createObjectURL(file);
    
    setUploadedFile(file);
    setPreviewUrl(newPreviewUrl);
    setImage(newPreviewUrl);
    setIsCustomImage(true);
    setError(null);
  };
  
  const resetImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadedFile(null);
    setPreviewUrl(null);
    setImage(defaultImage);
    setIsCustomImage(false);
    setError(null);
  };
  
  return {
    image,
    uploadedFile,
    isCustomImage,
    error,
    setError,
    handleImageChange,
    resetImage
  };
};