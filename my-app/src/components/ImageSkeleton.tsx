import React from 'react';
import styles from '@/styles/ImageSkeleton.module.css';

interface ImageSkeletonProps {
  className?: string;
}

const ImageSkeleton: React.FC<ImageSkeletonProps> = ({ className }) => {
  return (
    <div className={`${styles.skeleton} ${styles.shimmer} ${className || ''}`}></div>
  );
};

export default ImageSkeleton;