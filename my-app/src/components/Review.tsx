"use client";

import { useState, useCallback, memo } from "react";
import { Card, Image, Button, Form } from "react-bootstrap";
import { FaUser, FaStar, FaPen, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import styles from "@/styles/Review.module.css";
import ConfirmationModal from "./ConfirmationModal";

interface ReviewProps {
  review: {
    id: string | number;
    username: string;
    rating: number;
    text: string;
    profilePic: string;
    user_id?: string;
    isEditing?: boolean;
  };
  currentUserId?: string | null;
  onEditToggle: (id: string | number, isEditing: boolean) => void;
  onUpdateReview: (id: string | number, text: string, rating: number) => void;
  onDeleteReview?: (id: string | number) => void;
}

const Review: React.FC<ReviewProps> = ({ 
  review, 
  currentUserId,
  onEditToggle, 
  onUpdateReview,
  onDeleteReview = () => {} // Default empty function if not provided
}) => {
  const { id, username, rating, text, profilePic, user_id, isEditing } = review;
  
  // Determine if the current user is the author of the review
  const isAuthor = currentUserId && user_id && currentUserId === user_id;
  
  // State for edited text and rating
  const [editedText, setEditedText] = useState(text);
  const [editedRating, setEditedRating] = useState(rating);
  const [hoverRating, setHoverRating] = useState(0);
  
  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Handle edit review - toggle editing mode
  const handleEditReview = useCallback(() => {
    setEditedText(text); // Reset to original text when starting edit
    setEditedRating(rating); // Reset to original rating when starting edit
    onEditToggle(id, true);
  }, [id, onEditToggle, text, rating]);

  // Handle save review changes
  const handleSaveReview = useCallback(() => {
    onUpdateReview(id, editedText, editedRating);
  }, [id, editedText, editedRating, onUpdateReview]);

  // Handle discard review changes
  const handleDiscardChanges = useCallback(() => {
    setEditedText(text);
    setEditedRating(rating);
    onEditToggle(id, false);
  }, [id, onEditToggle, text, rating]);

  // Handle delete review
  const handleDeleteReview = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  // Confirm delete review
  const confirmDeleteReview = useCallback(() => {
    onDeleteReview(id);
    setShowDeleteModal(false);
  }, [id, onDeleteReview]);

  // Handle hover rating change
  const handleHoverRatingChange = useCallback((value: number) => {
    setHoverRating(value);
  }, []);

  // Handle rating change
  const handleRatingChange = useCallback((value: number) => {
    setEditedRating(value);
  }, []);

  // Handle text change
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  }, []);

  return (
    <>
      <Card className={`mb-3 ${styles.reviewCard}`} bg="transparent">
        <Card.Body className="d-flex">
          <div className="me-3">
            {profilePic ? (
              <Image src={profilePic} roundedCircle width={50} height={50} alt={username} />
            ) : (
              <FaUser size={50} color="#112D4E" />
            )}
          </div>
          <div className="flex-grow-1">
            <Card.Title className={styles.reviewTitle}>{username}</Card.Title>
            <div className="d-flex align-items-center mb-2">
              {isEditing ? (
                <div className={styles.ratingStars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FaStar
                      key={i}
                      color={(hoverRating || editedRating) > i ? "gold" : "lightgray"}
                      className={styles.editableStar}
                      onMouseEnter={() => handleHoverRatingChange(i + 1)}
                      onMouseLeave={() => handleHoverRatingChange(0)}
                      onClick={() => handleRatingChange(i + 1)}
                    />
                  ))}
                  <span className={styles.reviewScore}> {editedRating}/5</span>
                </div>
              ) : (
                <>
                  {Array.from({ length: rating }).map((_, i) => (
                    <FaStar key={i} color="gold" />
                  ))}
                  {Array.from({ length: 5 - rating }).map((_, i) => (
                    <FaStar key={i + rating} color="lightgray" />
                  ))}
                  <span className={styles.reviewScore}> {rating}/5</span>
                </>
              )}
            </div>
            
            {isEditing ? (
              <Form.Control
                as="textarea"
                value={editedText}
                onChange={handleTextChange}
                className={styles.reviewTextField}
                rows={3}
              />
            ) : (
              <Card.Text className={styles.reviewText}>{text}</Card.Text>
            )}
          </div>
          
          {/* Review action buttons - only show if user is the author */}
          {isAuthor && (
            <div className={styles.reviewActions}>
              {isEditing ? (
                <>
                  <Button 
                    className={styles.actionButton}
                    onClick={handleSaveReview}
                    title="Save review"
                  >
                    <FaCheck />
                  </Button>
                  <Button 
                    className={styles.actionButton}
                    onClick={handleDiscardChanges}
                    title="Discard changes"
                  >
                    <FaTimes />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    className={styles.actionButton}
                    onClick={handleEditReview}
                    title="Edit review"
                  >
                    <FaPen />
                  </Button>
                  <Button 
                    className={styles.actionButton}
                    onClick={handleDeleteReview}
                    title="Delete review"
                  >
                    <FaTrash />
                  </Button>
                </>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteReview}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
};

// Use memo to prevent unnecessary re-renders
export default memo(Review);