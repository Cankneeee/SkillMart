import React from 'react';
import styles from '@/styles/ImageSkeleton.module.css';

interface ImageSkeletonProps {
  className?: string;
}

/**
 * ImageSkeleton - A simple skeleton placeholder for images
 * 
 * This component displays a shimmering placeholder that can be used
 * as a fallback in Suspense for Image components.
 */
const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ className }) => {
  return (
    <div className={`${styles.skeleton} ${styles.shimmer} ${className || ''}`}></div>
  );
};

export default ImageSkeleton;