import { Card } from "react-bootstrap";
import styles from "@/styles/ReviewSkeleton.module.css";

const ReviewSkeleton = () => {
  return (
    <Card className={`mb-3 ${styles.reviewCard}`} bg="transparent">
      <Card.Body className="d-flex">
        <div className="me-3">
          <div className={`${styles.skeletonProfileImage} ${styles.shimmer}`}></div>
        </div>
        <div className="flex-grow-1">
          <div className={`${styles.skeletonReviewTitle} ${styles.shimmer}`}></div>
          <div className="d-flex align-items-center mb-2">
            <div className={`${styles.skeletonStars} ${styles.shimmer}`}></div>
          </div>
          <div className={`${styles.skeletonReviewText} ${styles.shimmer}`}></div>
          <div className={`${styles.skeletonReviewText} ${styles.shimmer}`} style={{ width: '95%' }}></div>
          <div className={`${styles.skeletonReviewText} ${styles.shimmer}`} style={{ width: '60%' }}></div>
        </div>
        
        {/* Empty space for action buttons */}
        <div className={styles.reviewActions}></div>
      </Card.Body>
    </Card>
  );
};

export default ReviewSkeleton;