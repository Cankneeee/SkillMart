import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ImageSkeleton from "./ImageSkeleton";
import { FaUser, FaStar, FaRegStar } from "react-icons/fa";
import styles from "@/styles/ListingCard.module.css";

// Import constants only
import { DEFAULT_LISTING_IMAGE, DEFAULT_PROFILE_IMAGE } from "@/utils/imageUtils";

interface ListingCardProps {
  id: string;
  title: string;
  image: string;
  listingType: string;
  category: string;
  user_id: string;
  authorName: string;
  authorProfilePic?: string;
  rating: number;
  reviewCount: number;
}

// No "use client" directive - this is a server component
const ListingCard = ({
  id,
  title,
  image,
  listingType,
  category,
  authorName,
  authorProfilePic,
  rating,
  reviewCount,
}: ListingCardProps) => {
  // Generate stars based on rating
  const renderStars = () => {
    const stars = [];
    const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
    
    for (let i = 1; i <= 5; i++) {
      if (i <= roundedRating) {
        stars.push(<FaStar key={i} className={styles.star} />);
      } else {
        stars.push(<FaRegStar key={i} className={styles.star} />);
      }
    }
    
    return stars;
  };

  return (
    <Link href={`/listing/${id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
            <Suspense fallback={<ImageSkeleton className={styles.cardImage} />}>
              <Image 
                src={image || DEFAULT_LISTING_IMAGE} 
                alt={title}
                width={300}
                height={200}
                className={styles.cardImage}
                loading="lazy" // Below the fold - listed in grid/category view
                onError={(e) => {
                  // Handle image errors in an inline function
                  const target = e.target as HTMLImageElement;
                  target.src = DEFAULT_LISTING_IMAGE;
                }}
              />
            </Suspense>
          <div className={styles.typeBadge}>{listingType}</div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.categoryTag}>{category}</div>
          <h3 className={styles.cardTitle}>{title}</h3>
          
          <div className={styles.authorContainer}>
            <div className={styles.authorImageWrapper}>
              {authorProfilePic ? (
                <Suspense fallback={<ImageSkeleton className={styles.authorImage} />}>
                  <Image 
                    src={authorProfilePic || DEFAULT_PROFILE_IMAGE} 
                    alt={authorName} 
                    width={30}
                    height={30}
                    className={styles.authorImage}
                    loading="lazy" // Below the fold - listed in grid/category view
                    onError={(e) => {
                      // Handle image errors in an inline function
                      const target = e.target as HTMLImageElement;
                      target.src = DEFAULT_PROFILE_IMAGE;
                    }}
                  />
                </Suspense>
              ) : (
                <FaUser className={styles.defaultAuthorIcon} />
              )}
            </div>
            <div className={styles.authorName}>
              {authorName}
            </div>
          </div>
          
          <div className={styles.ratingContainer}>
            <div className={styles.stars}>
              {renderStars()}
            </div>
            <div className={styles.rating}>
              {rating.toFixed(1)}
            </div>
            <div className={styles.reviewCount}>
              ({reviewCount})
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ListingCard;