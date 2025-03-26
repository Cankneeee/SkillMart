import styles from "@/styles/ListingCard.module.css";

const ListingCardSkeleton = () => {
  return (
    <div className={styles.card}>
      <div className={`${styles.imageContainer} ${styles.shimmer}`}>
        <div className={styles.skeletonImage}></div>
        <div className={`${styles.typeBadge} ${styles.skeletonTypeBadge}`}></div>
      </div>
      <div className={styles.cardBody}>
        <div className={`${styles.categoryTag} ${styles.skeletonCategoryTag}`}></div>
        <div className={`${styles.cardTitle} ${styles.skeletonTitle}`}></div>
        
        <div className={styles.authorContainer}>
          <div className={`${styles.authorImageWrapper} ${styles.skeletonAuthorImage}`}></div>
          <div className={`${styles.authorName} ${styles.skeletonAuthorName}`}></div>
        </div>
        
        <div className={styles.ratingContainer}>
          <div className={`${styles.stars} ${styles.skeletonStars}`}></div>
        </div>
      </div>
    </div>
  );
};

export default ListingCardSkeleton;