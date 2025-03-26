"use client";

import React, { useEffect, useRef, useState, Suspense} from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
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
  const { userId, username, setUsername, profilePicture, setProfilePicture } = useUser();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("********");

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // Local state for editing so that changes only update context on save
  const [editedUsername, setEditedUsername] = useState(username || "");
  const [editedEmail, setEditedEmail] = useState(email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Use image with fallback hook
  const { imgSrc: displayImage, onError: handleProfileImgError } = useImageWithFallback(
    profilePicture || '',
    DEFAULT_PROFILE_IMAGE
  );

  // Sync local editing states with context when they update
  useEffect(() => {
    setEditedUsername(username || "");
    setEditedEmail(email || "");
  }, [username, email]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      
      try {
        // Use auth utility to get current user
        const user = await getUser();

        if (!user) {
          setErrorMessage("Failed to fetch user data.");
          setLoading(false);
          return;
        }

        const profile = await getUserProfile(user.id);
        if (!profile) {
          setErrorMessage("Error loading profile.");
        } else {
          setUsername(profile.username || "");
          setEmail(profile.email || "");
          setProfilePicture(profile.profile_picture || "");
        }
      } catch (error: any) {
        setErrorMessage(error.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [setUsername, setProfilePicture, setEmail]);

  // Handle profile picture upload
  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) {
      setErrorMessage("User not authenticated.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      // Validate file type
      const fileType = file.type;
      if (!fileType.startsWith('image/')) {
        setErrorMessage('Only images are allowed');
        return;
      }
      
      // Validate file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size should be less than 5MB');
        return;
      }
      
      const { imageUrl, error } = await uploadProfilePicture(userId, file);

      if (error) {
        setErrorMessage(error);
        return;
      }

      setProfilePicture(imageUrl || "");
      setSuccessMessage("Profile picture updated successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to upload profile picture");
    } finally {
      setLoading(false);
    }
  };

  // Handle username save (updates context only on save)
  const handleUsernameSave = async () => {
    if (!userId || editedUsername.trim() === "") return;

    try {
      setLoading(true);
      const { error } = await updateProfileField(userId, "username", editedUsername);
      
      if (error) {
        setErrorMessage("Failed to update username.");
        return;
      }
      
      setUsername(editedUsername);
      setIsEditingUsername(false);
      setSuccessMessage("Username updated successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to update username");
    } finally {
      setLoading(false);
    }
  };

  // Handle email save (updates local email only on save)
  const handleEmailSave = async () => {
    if (!userId || editedEmail.trim() === "") return;

    try {
      setLoading(true);
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedEmail.trim())) {
        setErrorMessage("Please enter a valid email address");
        return;
      }
      
      const { error } = await updateProfileField(userId, "email", editedEmail);
      
      if (error) {
        setErrorMessage("Failed to update email.");
        return;
      }
      
      setEmail(editedEmail);
      setIsEditingEmail(false);
      setSuccessMessage("Email updated successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  // Handle password save
  const handlePasswordSave = async () => {
    if (!userId) return;
    
    // Reset error state
    setPasswordError("");
    
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
    
    try {
      setLoading(true);
      // Use auth utility to update password
      const { error } = await updatePassword(newPassword);
      
      if (error) {
        setPasswordError(`Failed to update password: ${error.message}`);
        return;
      }
      
      // Reset state and exit edit mode
      setPassword("********");
      setNewPassword("");
      setConfirmPassword("");
      setIsEditingPassword(false);
      setSuccessMessage("Password updated successfully");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      setPasswordError(`Failed to update password: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.profileContainer}>
      {loading && <p className={styles.loadingText}>Loading profile...</p>}
      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
      {successMessage && <p className={styles.successText}>{successMessage}</p>}
      
      <div className={styles.profileContent}>
        <div className={styles.profileHeader}>
          <div className={styles.profileImageContainer}>
            <Suspense fallback={<ImageSkeleton className={styles.profileImage} />}>
              <Image 
                src={displayImage}
                alt="Profile" 
                className={styles.profileImage}
                width={120}
                height={120}
                onError={handleProfileImgError}
                priority
              />
            </Suspense>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleProfilePictureUpload}
            hidden
          />
          <Button 
            className={styles.editProfileButton} 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <FaPen />
          </Button>
        </div>

      {/* USERNAME ROW */}
      <div className={styles.profileRow}>
        <div className={styles.profileLabel}>Username</div>
        <div className={styles.profileValue}>
          {isEditingUsername ? (
            <Form.Control
              type="text"
              value={editedUsername}
              onChange={(e) => setEditedUsername(e.target.value)}
              className={styles.inputField}
            />
          ) : (
            username
          )}
        </div>
        <div className={styles.buttonColumn}>
          {isEditingUsername ? (
            <>
              <Button 
                className={styles.editButton} 
                onClick={handleUsernameSave}
                disabled={loading}
              >
                <FaCheck />
              </Button>
              <Button 
                className={styles.editButton} 
                onClick={() => setIsEditingUsername(false)}
                disabled={loading}
              >
                <FaTimes />
              </Button>
            </>
          ) : (
            <Button 
              className={styles.editButton} 
              onClick={() => setIsEditingUsername(true)}
              disabled={loading}
            >
              <FaPen />
            </Button>
          )}
        </div>
      </div>

      {/* EMAIL ROW */}
      <div className={styles.profileRow}>
        <div className={styles.profileLabel}>Email</div>
        <div className={styles.profileValue}>
          {isEditingEmail ? (
            <Form.Control
              type="email"
              value={editedEmail}
              onChange={(e) => setEditedEmail(e.target.value)}
              className={styles.inputField}
            />
          ) : (
            email
          )}
        </div>
        <div className={styles.buttonColumn}>
          {isEditingEmail ? (
            <>
              <Button 
                className={styles.editButton} 
                onClick={handleEmailSave}
                disabled={loading}
              >
                <FaCheck />
              </Button>
              <Button 
                className={styles.editButton} 
                onClick={() => setIsEditingEmail(false)}
                disabled={loading}
              >
                <FaTimes />
              </Button>
            </>
          ) : (
            <Button 
              className={styles.editButton} 
              onClick={() => setIsEditingEmail(true)}
              disabled={loading}
            >
              <FaPen />
            </Button>
          )}
        </div>
      </div>

      {/* PASSWORD ROW */}
      <div className={styles.profileRow}>
        <div className={styles.profileLabel}>Password</div>
        <div className={styles.profileValue}>
          {isEditingPassword ? (
            <>
              <Form.Control
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError("");
                }}
                className={`${styles.inputField} ${passwordError ? styles.inputFieldError : ""}`}
              />
              <Form.Control
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
                className={`${styles.inputField} ${passwordError ? styles.inputFieldError : ""}`}
                style={{ marginTop: "8px" }}
              />
              {passwordError && <p className={styles.errorText}>{passwordError}</p>}
            </>
          ) : (
            "********"
          )}
        </div>
        <div className={styles.buttonColumn}>
          {isEditingPassword ? (
            <>
              <Button 
                className={styles.editButton} 
                onClick={handlePasswordSave}
                disabled={loading}
              >
                <FaCheck />
              </Button>
              <Button 
                className={styles.editButton} 
                onClick={() => {
                  setIsEditingPassword(false);
                  setPasswordError("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={loading}
              >
                <FaTimes />
              </Button>
            </>
          ) : (
            <Button 
              className={styles.editButton} 
              onClick={() => setIsEditingPassword(true)}
              disabled={loading}
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