"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { Button, Form } from "react-bootstrap"; // Removed unused Container, Row, Col
import { FaPen, FaCheck, FaTimes, FaUserCircle } from "react-icons/fa";
import { getUser, updatePassword } from "@/utils/auth";
import { getUserProfile, updateProfileField } from "@/lib/database";
import styles from "@/styles/Profile.module.css";
import Image from "next/image";
import ImageSkeleton from "./ImageSkeleton";
import { validatePassword } from "@/utils/validation";
import {
  DEFAULT_PROFILE_IMAGE,
  useImageWithFallback,
  uploadProfilePicture
} from "@/utils/imageUtils";
import { useUser } from "@/context/UserContext"; // Use UserContext

const Profile: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Use context for user data, allowing updates to reflect globally if needed
  const { userId, username, setUsername, profilePicture, setProfilePicture } = useUser();

  // Local state for email and password display/editing
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("********"); // Placeholder

  // State for managing edit modes
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // Local state for temporary edits
  const [editedUsername, setEditedUsername] = useState(username || "");
  const [editedEmail, setEditedEmail] = useState(email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Loading and feedback state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Hook for handling image source and fallback
  const { imgSrc: displayImage, onError: handleProfileImgError } = useImageWithFallback(
    profilePicture || '', // Use profilePicture from context
    DEFAULT_PROFILE_IMAGE
  );

  // Effect to sync local edit states if context values change externally
  useEffect(() => {
    setEditedUsername(username || "");
  }, [username]);

  useEffect(() => {
    setEditedEmail(email || "");
  }, [email]);

  // Effect to fetch initial profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setErrorMessage(null); // Clear previous errors
      try {
        const user = await getUser(); // Get authenticated user
        if (!user) {
          // Handle case where user is not logged in (e.g., redirect or show message)
          setErrorMessage("User not authenticated.");
          // Optionally redirect: router.push('/login');
          return;
        }

        // Fetch profile using the authenticated user's ID
        const profile = await getUserProfile(user.id);
        if (profile) {
          // Update context and local state
          setUsername(profile.username || "");
          setEmail(profile.email || ""); // Set local email state
          setProfilePicture(profile.profile_picture || "");
          setEditedEmail(profile.email || ""); // Sync edit state
          setEditedUsername(profile.username || ""); // Sync edit state
        } else {
          setErrorMessage("Profile not found.");
        }
      } catch (error: any) {
        setErrorMessage(error.message || "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    // Run only once on mount, dependencies are handled by context/state
  }, [setEmail, setProfilePicture, setUsername]); // Add setEmail to dependency array

  // Handler for profile picture file selection and upload
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) {
      setErrorMessage("User not authenticated.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous messages
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      // Basic file validation (optional but recommended)
      const fileType = file.type;
      if (!fileType.startsWith('image/')) {
        throw new Error('Only image files are allowed.');
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Image size should be less than 5MB.');
      }

      // Upload image using utility function
      const { imageUrl, error } = await uploadProfilePicture(userId, file);

      if (error) {
        throw new Error(error); // Throw error to be caught below
      }

      if (imageUrl) {
        setProfilePicture(imageUrl); // Update context
        setSuccessMessage("Profile picture updated successfully.");
        setTimeout(() => setSuccessMessage(null), 3000); // Clear message after 3s
      } else {
          throw new Error("Image URL not returned after upload.");
      }

    } catch (error: any) {
      setErrorMessage(error.message || "Failed to upload profile picture.");
    } finally {
      setLoading(false);
      // Reset file input to allow uploading the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handler for saving username changes
  const handleUsernameSave = async () => {
    if (!userId || editedUsername.trim() === "") return;
    if (editedUsername === username) { // No change
      setIsEditingUsername(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Update profile field using database utility
      const { error } = await updateProfileField(userId, "username", editedUsername.trim());
      if (error) throw error;

      setUsername(editedUsername.trim()); // Update context
      setIsEditingUsername(false);
      setSuccessMessage("Username updated successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to update username.");
      setEditedUsername(username || ""); // Revert local state on error
    } finally {
      setLoading(false);
    }
  };

  // Handler for saving email changes
  const handleEmailSave = async () => {
    if (!userId || editedEmail.trim() === "") return;
    if (editedEmail === email) { // No change
      setIsEditingEmail(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedEmail.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Update profile field using database utility
      // Note: Changing email might require re-verification depending on Supabase settings
      const { error } = await updateProfileField(userId, "email", editedEmail.trim());
      if (error) throw error;

      setEmail(editedEmail.trim()); // Update local state
      setIsEditingEmail(false);
      setSuccessMessage("Email updated successfully. Check your inbox if verification is required.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to update email.");
      setEditedEmail(email || ""); // Revert local state on error
    } finally {
      setLoading(false);
    }
  };

  // Handler for saving password changes
  const handlePasswordSave = async () => {
    if (!userId) return;

    setPasswordError(""); // Clear previous password errors
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate password strength
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Update password using auth utility
      const { error } = await updatePassword(newPassword);
      if (error) throw error;

      // Reset state and exit edit mode on success
      setPassword("********"); // Reset placeholder
      setNewPassword("");
      setConfirmPassword("");
      setIsEditingPassword(false);
      setSuccessMessage("Password updated successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setPasswordError(error.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  // Render component
  return (
    <div className={styles.profileContainer}>
      {/* Feedback messages */}
      {loading && <p className={styles.loadingText}>Loading...</p>}
      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
      {successMessage && <p className={styles.successText}>{successMessage}</p>}

      <div className={styles.profileContent}>
        {/* Profile Header with Image and Edit Button */}
        <div className={styles.profileHeader}>
          {/* --- Wrapper for Image and Button --- */}
          <div className={styles.imageButtonWrapper}>
            <Suspense fallback={<ImageSkeleton className={styles.profileImage} />}>
              <Image
                src={displayImage} // Use state variable from useImageWithFallback
                alt="Profile Picture"
                className={styles.profileImage}
                width={120}
                height={120}
                onError={handleProfileImgError} // Use error handler from useImageWithFallback
                priority // Load profile picture eagerly
              />
            </Suspense>
            {/* Hidden file input triggered by the button */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleProfilePictureUpload}
              style={{ display: 'none' }} // Keep it hidden
              disabled={loading}
            />
            {/* Button to trigger file input */}
            <Button
              className={styles.editProfileButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              aria-label="Edit profile picture"
            >
              <FaPen />
            </Button>
          </div>
          {/* --- End Wrapper --- */}
        </div>

        {/* Username Row */}
        <div className={styles.profileRow}>
          <div className={styles.profileLabel}>Username</div>
          <div className={styles.profileValue}>
            {isEditingUsername ? (
              <Form.Control
                type="text"
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
                className={styles.inputField}
                disabled={loading}
                aria-label="Edit Username"
              />
            ) : (
              username || "Not set" // Display username from context
            )}
          </div>
          <div className={styles.buttonColumn}>
            {isEditingUsername ? (
              <>
                <Button
                  className={styles.editButton}
                  onClick={handleUsernameSave}
                  disabled={loading || editedUsername === username}
                  aria-label="Save Username"
                >
                  <FaCheck />
                </Button>
                <Button
                  className={styles.editButton}
                  onClick={() => { setIsEditingUsername(false); setEditedUsername(username || ""); }}
                  disabled={loading}
                  aria-label="Cancel Username Edit"
                >
                  <FaTimes />
                </Button>
              </>
            ) : (
              <Button
                className={styles.editButton}
                onClick={() => setIsEditingUsername(true)}
                disabled={loading}
                aria-label="Edit Username"
              >
                <FaPen />
              </Button>
            )}
          </div>
        </div>

        {/* Email Row */}
        <div className={styles.profileRow}>
          <div className={styles.profileLabel}>Email</div>
          <div className={styles.profileValue}>
            {isEditingEmail ? (
              <Form.Control
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className={styles.inputField}
                disabled={loading}
                aria-label="Edit Email"
              />
            ) : (
              email || "Not set" // Display email from local state
            )}
          </div>
          <div className={styles.buttonColumn}>
            {isEditingEmail ? (
              <>
                <Button
                  className={styles.editButton}
                  onClick={handleEmailSave}
                  disabled={loading || editedEmail === email}
                  aria-label="Save Email"
                >
                  <FaCheck />
                </Button>
                <Button
                  className={styles.editButton}
                  onClick={() => { setIsEditingEmail(false); setEditedEmail(email || ""); setErrorMessage(null);}}
                  disabled={loading}
                  aria-label="Cancel Email Edit"
                >
                  <FaTimes />
                </Button>
              </>
            ) : (
              <Button
                className={styles.editButton}
                onClick={() => setIsEditingEmail(true)}
                disabled={loading}
                aria-label="Edit Email"
              >
                <FaPen />
              </Button>
            )}
          </div>
        </div>

        {/* Password Row */}
        <div className={styles.profileRow}>
          <div className={styles.profileLabel}>Password</div>
          <div className={styles.profileValue}>
            {isEditingPassword ? (
              <div style={{ width: '100%' }}> {/* Wrapper for column layout */}
                <Form.Control
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                  className={`${styles.inputField} ${passwordError ? styles.inputFieldError : ""}`}
                  disabled={loading}
                  aria-label="New Password"
                />
                <Form.Control
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                  className={`${styles.inputField} ${passwordError ? styles.inputFieldError : ""}`}
                  style={{ marginTop: "8px" }}
                  disabled={loading}
                  aria-label="Confirm New Password"
                />
                {passwordError && <p className={styles.errorText} style={{ textAlign: 'left', marginTop: '4px' }}>{passwordError}</p>}
              </div>
            ) : (
              password // Display placeholder
            )}
          </div>
          <div className={styles.buttonColumn}>
            {isEditingPassword ? (
              <>
                <Button
                  className={styles.editButton}
                  onClick={handlePasswordSave}
                  disabled={loading || !newPassword || !confirmPassword}
                  aria-label="Save Password"
                >
                  <FaCheck />
                </Button>
                <Button
                  className={styles.editButton}
                  onClick={() => { setIsEditingPassword(false); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }}
                  disabled={loading}
                  aria-label="Cancel Password Edit"
                >
                  <FaTimes />
                </Button>
              </>
            ) : (
              <Button
                className={styles.editButton}
                onClick={() => setIsEditingPassword(true)}
                disabled={loading}
                aria-label="Edit Password"
              >
                <FaPen />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
