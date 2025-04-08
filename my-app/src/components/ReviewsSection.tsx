"use client";

import { useState, useEffect, useCallback } from "react";
import { Form, Row, Col, Card, Dropdown, Accordion, Button, Spinner } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import dynamic from "next/dynamic";
import ReviewSkeleton from "./ReviewSkeleton";
import styles from "@/styles/ReviewsSection.module.css";
import { reviewApi, userApi } from "@/lib/api"; // Import userApi
import { createClient } from "@/utils/supabase/client";

// Lazy load the Review component
const DynamicReview = dynamic(() => import("./Review"), {
  loading: () => <ReviewSkeleton />
});

interface ReviewsSectionProps {
  listingId: string;
  userId: string | null;
}

// Adjusted ReviewData interface for the component's state
interface ReviewData {
  id: string | number;
  username: string;
  rating: number;
  text: string;
  profilePic: string;
  user_id?: string; // Keep user_id for checks
  isEditing?: boolean;
}

interface AISummary {
  summary: string;
  pros: string[];
  cons: string[];
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ listingId, userId }) => {
  const supabase = createClient();
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [dropdownLabel, setDropdownLabel] = useState("Newest");
  const [reviews, setReviews] = useState<ReviewData[]>([]); // Use the adjusted ReviewData interface
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState("0.0");
  const [reviewCount, setReviewCount] = useState(0);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  // New review form states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // AI Summary states
  const [aiSummary, setAiSummary] = useState<AISummary>({
    summary: "",
    pros: [],
    cons: []
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);

  // Fetch reviews and then profiles
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      // Step 1: Fetch raw review data using the modified API call
      const { data: rawReviewsData, error: reviewsFetchError } = await reviewApi.getListingReviews(listingId);

      if (reviewsFetchError) {
        // Use the original error message from the API call
        throw new Error(reviewsFetchError);
      }

      const rawReviews = rawReviewsData || [];

      // Step 2: Fetch profiles for each review and format the data
      const reviewsWithProfiles = await Promise.all(rawReviews.map(async (review) => {
          let userProfileInfo = { username: "Anonymous", profile_picture: "" }; // Default profile

          if (review.user_id) {
              try {
                  // Use userApi to fetch profile
                  const { data: profileData, error: profileError } = await userApi.getProfile(review.user_id);
                  if (profileError) {
                    console.error(`Failed to fetch profile for user ${review.user_id}:`, profileError);
                    // Keep default profile on error
                  } else if (profileData) {
                      userProfileInfo = {
                          username: profileData.username || "Anonymous",
                          profile_picture: profileData.profile_picture || ""
                      };
                  }
              } catch (profileFetchError) {
                  console.error(`Exception fetching profile for user ${review.user_id}:`, profileFetchError);
                  // Keep default profile on error
              }
          }

          // Format the data structure expected by the DynamicReview component
          return {
              id: review.id,
              username: userProfileInfo.username,
              rating: review.rating,
              text: review.comment || "",
              profilePic: userProfileInfo.profile_picture, // Use fetched profile picture
              user_id: review.user_id, // Pass user_id for ownership checks in Review component
              isEditing: false // Default editing state
          };
      }));

      setReviews(reviewsWithProfiles); // Set the state with formatted reviews including profile info

      // Step 3: Check if the current user has reviewed
      if (userId && rawReviews.length > 0) {
          const hasReviewed = rawReviews.some(review => review.user_id === userId);
          setUserHasReviewed(hasReviewed);
      } else {
          setUserHasReviewed(false);
      }

      // Step 4: Fetch the average rating and count
      const { data: ratingData, error: ratingError } = await reviewApi.getListingRating(listingId);
      if (ratingError) {
          console.error("Error fetching rating:", ratingError);
          setAverageRating("0.0");
          setReviewCount(0);
      } else if (ratingData) {
          setAverageRating(ratingData.average.toFixed(1));
          setReviewCount(ratingData.count);
      }

    } catch (error: any) {
        console.error("Error in fetchReviews process:", error);
        // Use the specific error message caught or a generic one
        setLoadError(error.message || "Failed to load reviews and user profiles");
        setReviews([]);
        setAverageRating("0.0");
        setReviewCount(0);
    } finally {
        setIsLoading(false);
    }
  }, [listingId, userId]); // Dependencies for fetching


  // Fetch AI summary (keep existing logic)
  const fetchAISummary = useCallback(async () => {
    // ... (keep existing fetchAISummary logic)
    if (reviews.length === 0) return;
    setIsSummaryLoading(true);
    try {
      const response = await fetch('/api/review-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate summary');
      setAiSummary({ summary: data.summary, pros: data.pros || [], cons: data.cons || [] });
    } catch (error) {
      console.error('Error fetching AI summary:', error);
      setAiSummary({ summary: "Unable to generate summary at this time.", pros: [], cons: [] });
    } finally {
      setIsSummaryLoading(false);
    }
  }, [listingId, reviews.length]);

  useEffect(() => {
    if (listingId) {
      fetchReviews();
    }
  }, [listingId, fetchReviews]);

  useEffect(() => {
    if (reviews.length > 0 && !aiSummary.summary && !isSummaryLoading) {
      fetchAISummary();
    }
  }, [reviews, aiSummary, isSummaryLoading, fetchAISummary]);


  // Sort reviews (keep existing logic, uses the component's `reviews` state)
  const getSortedReviews = useCallback(() => {
    return [...reviews].sort((a, b) => {
      if (userId) {
        if (a.user_id === userId && b.user_id !== userId) return -1;
        if (a.user_id !== userId && b.user_id === userId) return 1;
      }
      if (sortOption === "newest") return String(b.id).localeCompare(String(a.id)); // Use ID for sorting if date isn't available
      if (sortOption === "oldest") return String(a.id).localeCompare(String(b.id));
      if (sortOption === "highest") return b.rating - a.rating;
      if (sortOption === "lowest") return a.rating - b.rating;
      return 0;
    });
  }, [reviews, sortOption, userId]);

  const sortedReviews = getSortedReviews();

  // Handle sort change (keep existing logic)
  const handleSortChange = useCallback((sortType: "newest" | "oldest" | "highest" | "lowest", label: string) => {
    setSortOption(sortType);
    setDropdownLabel(label);
  }, []);

  // Handle edit toggle (keep existing logic)
  const handleEditToggle = useCallback((id: string | number, isEditing: boolean) => {
    setReviews(prevReviews => prevReviews.map(review =>
      review.id === id ? { ...review, isEditing } : review
    ));
  }, []);

  // Handle updating a review (keep existing logic)
  const handleUpdateReview = useCallback(async (id: string | number, text: string, rating: number) => {
    // ... (keep existing handleUpdateReview logic, it calls reviewApi.updateReview)
     if (!userId) return;
    try {
      const { data, error } = await reviewApi.updateReview(id.toString(), userId, { rating, comment: text });
      if (error) throw new Error(error);
      // Update local state optimistically or based on response
      setReviews(prevReviews => prevReviews.map(review =>
        review.id === id ? { ...review, text, rating, isEditing: false } : review
      ));
      const { data: ratingData } = await reviewApi.getListingRating(listingId);
      if (ratingData) setAverageRating(ratingData.average.toFixed(1));
      setAiSummary({ summary: "", pros: [], cons: [] }); // Trigger summary refresh
    } catch (error: any) {
      console.error("Error updating review:", error);
    }
  }, [userId, listingId]);

  // Handle deleting a review (keep existing logic)
  const handleDeleteReview = useCallback(async (id: string | number) => {
    // ... (keep existing handleDeleteReview logic, it calls reviewApi.deleteReview)
     if (!userId) return;
    try {
      const { data: success, error } = await reviewApi.deleteReview(id.toString(), userId);
      if (error) throw new Error(error);
      if (success) {
        setReviews(prevReviews => {
          const updatedReviews = prevReviews.filter(review => review.id !== id);
          const wasUserReview = prevReviews.find(review => review.id === id && review.user_id === userId);
          if (wasUserReview) setUserHasReviewed(false);
          return updatedReviews;
        });
        const { data: ratingData } = await reviewApi.getListingRating(listingId);
        if (ratingData) {
          setAverageRating(ratingData.average.toFixed(1));
          setReviewCount(ratingData.count);
        }
        setAiSummary({ summary: "", pros: [], cons: [] }); // Trigger summary refresh
      }
    } catch (error: any) {
      console.error("Error deleting review:", error);
    }
  }, [userId, listingId]);

  // Toggle review form visibility (keep existing logic)
  const toggleReviewForm = useCallback(() => {
    // ... (keep existing toggleReviewForm logic)
     if (userId) {
      setShowReviewForm(prev => !prev);
      setError("");
    } else {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }
  }, [userId]);

  // Handle submitting a new review (update to fetch profile after creation)
  const handleSubmitReview = useCallback(async () => {
    if (!userId) {
        setError("You must be logged in to leave a review");
        return;
    }
    if (newReviewRating < 1) {
        setError("Please select a rating");
        return;
    }

    try {
        setSubmitting(true);
        setError("");

        const reviewData = {
            listing_id: listingId,
            user_id: userId,
            rating: newReviewRating,
            comment: newReviewText
        };

        // Create review
        const { data: newReview, error } = await reviewApi.createReview(reviewData);
        if (error) throw new Error(error);
        if (!newReview) throw new Error("Failed to create review");

        // Fetch the user's profile to display immediately
        let userProfileInfo = { username: "Anonymous", profile_picture: "" };
        try {
            const { data: profileData } = await userApi.getProfile(userId);
            if (profileData) {
                userProfileInfo = {
                    username: profileData.username || "Anonymous",
                    profile_picture: profileData.profile_picture || ""
                };
            }
        } catch (profileError) {
            console.error("Failed to fetch profile for new review:", profileError);
        }

        // Format the new review with profile data
        const formattedReview: ReviewData = {
            id: newReview.id,
            username: userProfileInfo.username,
            rating: newReview.rating,
            text: newReview.comment || "",
            profilePic: userProfileInfo.profile_picture,
            user_id: userId,
            isEditing: false
        };

        // Update local state
        setReviews(prevReviews => [formattedReview, ...prevReviews]);
        setUserHasReviewed(true);
        setShowReviewForm(false);
        setNewReviewText("");
        setNewReviewRating(5);

        // Update average rating and count
        const { data: ratingData } = await reviewApi.getListingRating(listingId);
        if (ratingData) {
            setAverageRating(ratingData.average.toFixed(1));
            setReviewCount(ratingData.count);
        }

        // Trigger AI summary refresh
        setAiSummary({ summary: "", pros: [], cons: [] });

    } catch (error: any) {
        console.error("Error submitting review:", error);
        setError(error.message || "Failed to submit review");
    } finally {
        setSubmitting(false);
    }
  }, [listingId, newReviewRating, newReviewText, userId]); // Removed supabase dependency as userApi is used


  // ----- RENDER LOGIC -----

  if (isLoading) {
    // Display multiple skeletons while loading
    return (
        <div className="py-3">
            <Card className="mb-3" bg="transparent">
                <Card.Body><Spinner animation="border" size="sm"/> Loading ratings...</Card.Body>
            </Card>
            <ReviewSkeleton />
            <ReviewSkeleton />
            <ReviewSkeleton />
        </div>
    );
  }

  if (loadError) {
    // Display error state
    return (
        <div className="py-3">
            <Card bg="light" className="mb-3">
                <Card.Body>
                    <Card.Title className="text-danger">Error Loading Reviews</Card.Title>
                    <Card.Text>{loadError}</Card.Text>
                    <Button variant="primary" onClick={fetchReviews}>Retry</Button>
                </Card.Body>
            </Card>
        </div>
    );
  }

  // Render the main component content
  return (
    <div>
        {/* Average Rating Card */}
        <Card className="mb-3" bg="transparent">
            <Card.Body>
                <div className="d-flex align-items-center">
                    <h4 className={styles.averageRatingText}>Average Rating:</h4>
                    <div className="d-flex align-items-center ms-3">
                        <span className={styles.averageRatingScore}>{averageRating}</span>
                        <FaStar className="ms-1" color="gold" size={20} />
                    </div>
                    <span className="ms-2">({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                </div>
            </Card.Body>
        </Card>

        {/* Leave a Review Button */}
        {!userHasReviewed && (
          <div className="mb-4">
              <Button
                  variant="primary"
                  onClick={toggleReviewForm}
                  className={styles.leaveReviewButton}
              >
                  Leave a Review
              </Button>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <Card className="mb-4" bg="light">
              <Card.Body>
                  <Card.Title>Write Your Review</Card.Title>
                  <div className="mb-3">
                      <label className="d-block mb-2">Your Rating:</label>
                      <div className={styles.ratingStars}>
                          {Array.from({ length: 5 }).map((_, i) => (
                              <FaStar
                                  key={i}
                                  color={(hoverRating || newReviewRating) > i ? "gold" : "lightgray"}
                                  className={styles.editableStar}
                                  onMouseEnter={() => setHoverRating(i + 1)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  onClick={() => setNewReviewRating(i + 1)}
                              />
                          ))}
                          <span className={styles.reviewScore}> {newReviewRating}/5</span>
                      </div>
                  </div>
                  <Form.Group className="mb-3">
                      <Form.Label>Your Review:</Form.Label>
                      <Form.Control
                          as="textarea"
                          rows={3}
                          value={newReviewText}
                          onChange={(e) => setNewReviewText(e.target.value)}
                          placeholder="Share your experience with this listing..."
                      />
                  </Form.Group>
                  {error && <div className="text-danger mb-3">{error}</div>}
                  <div className="d-flex justify-content-end">
                      <Button variant="secondary" onClick={() => setShowReviewForm(false)} className="me-2" disabled={submitting}>Cancel</Button>
                      <Button variant="primary" onClick={handleSubmitReview} disabled={submitting} className={styles.leaveReviewButton}>
                          {submitting ? "Submitting..." : "Submit Review"}
                      </Button>
                  </div>
              </Card.Body>
          </Card>
        )}

        {/* AI Summary Section */}
        {reviews.length > 0 && (
          <Accordion className="mb-4" defaultActiveKey="0">
              <Accordion.Item eventKey="0" className={styles.aiSummaryAccordion}>
                  <Accordion.Header className={styles.aiSummaryHeader}>AI Generated Review Summary</Accordion.Header>
                  <Accordion.Body>
                      {isSummaryLoading ? (
                          <div className="text-center py-3"><Spinner animation="border" role="status" size="sm" /><span className="ms-2">Generating AI summary...</span></div>
                      ) : (
                          <div>
                              <p className={styles.aiSummaryText}>{aiSummary.summary}</p>
                              {aiSummary.pros.length > 0 && (
                                  <div className="mt-3">
                                      <h5 className={styles.summarySubheading}>Pros:</h5>
                                      <ul className={styles.summaryList}>
                                          {aiSummary.pros.map((pro, index) => (<li key={index} className={styles.summaryListItem}>{pro}</li>))}
                                      </ul>
                                  </div>
                              )}
                              {aiSummary.cons.length > 0 && (
                                  <div className="mt-3">
                                      <h5 className={styles.summarySubheading}>Cons:</h5>
                                      <ul className={styles.summaryList}>
                                          {aiSummary.cons.map((con, index) => (<li key={index} className={styles.summaryListItem}>{con}</li>))}
                                      </ul>
                                  </div>
                              )}
                          </div>
                      )}
                  </Accordion.Body>
              </Accordion.Item>
          </Accordion>
        )}

        {/* Sort options and review list */}
        {reviews.length > 0 ? (
            <>
                <Form.Group as={Row} className="mb-3 justify-content-end align-items-center">
                    <Col xs="auto"><Form.Label className={styles.sortLabel}>Sort by:</Form.Label></Col>
                    <Col xs="auto">
                        <Dropdown align="end">
                            <Dropdown.Toggle variant="light" className={styles.sortSelect}>{dropdownLabel}</Dropdown.Toggle>
                            <Dropdown.Menu className={styles.dropdownMenu}>
                                <Dropdown.Item onClick={() => handleSortChange("newest", "Newest")} active={sortOption === "newest"} className={styles.dropdownItem}>Newest</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleSortChange("oldest", "Oldest")} active={sortOption === "oldest"} className={styles.dropdownItem}>Oldest</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleSortChange("highest", "Highest Rating")} active={sortOption === "highest"} className={styles.dropdownItem}>Highest Rating</Dropdown.Item>
                                <Dropdown.Item onClick={() => handleSortChange("lowest", "Lowest Rating")} active={sortOption === "lowest"} className={styles.dropdownItem}>Lowest Rating</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Col>
                </Form.Group>
                <div>
                    {sortedReviews.map((review) => (
                        <DynamicReview
                            key={review.id}
                            review={review} // Pass the formatted review data
                            currentUserId={userId}
                            onEditToggle={handleEditToggle}
                            onUpdateReview={handleUpdateReview}
                            onDeleteReview={handleDeleteReview}
                        />
                    ))}
                </div>
            </>
        ) : (
            <div className="text-center my-4">
                <p>No reviews yet. Be the first to review this listing!</p>
            </div>
        )}
    </div>
  );
};

export default ReviewsSection;