'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { updatePassword, getUser } from '@/utils/auth';
import { validatePassword } from '@/utils/validation';
import styles from '@/styles/AuthForms.module.css';
import modalStyles from '@/styles/Modal.module.css';

export default function PasswordResetForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // State to store logged-in user's email (if available)
  const [email, setEmail] = useState<string | null>(null);

  // On mount, try to get the user's email from the current session
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const user = await getUser();
        if (user?.email) {
          setEmail(user.email);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUserEmail();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Reset error states
    setError(null);
    setPasswordError(false);
    setConfirmPasswordError(false);

    // Validate password strength
    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      setError(passwordValidationError);
      setPasswordError(true);
      setLoading(false);
      return;
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setPasswordError(true);
      setConfirmPasswordError(true);
      setLoading(false);
      return;
    }

    try {
      // Use the update password utility
      const { error: updateError } = await updatePassword(newPassword);

      if (updateError) {
        setError(updateError.message);
      } else {
        setShowModal(true);
        setTimeout(() => router.push('/login'), 3000); // Redirect even if user closes modal
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Set New Password</h2>
      
      {/* Display the user's email if found */}
      {email && (
        <p className={styles.userEmailDisplay}>
          You are resetting the password for: <strong>{email}</strong>
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="password"
          placeholder="New Password"
          className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setPasswordError(false);
            setError(null);
          }}
          required
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          className={`${styles.input} ${confirmPasswordError ? styles.inputError : ''}`}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setConfirmPasswordError(false);
            setError(null);
          }}
          required
        />
        {error && <p className={styles.errorMessage}>{error}</p>}
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      {/* Updated Modal with standardized styling */}
      <Modal show={showModal} onHide={() => router.push('/login')} className={modalStyles.modal}>
        <Modal.Header closeButton>
          <Modal.Title>Password Reset Successful</Modal.Title>
        </Modal.Header>
        <Modal.Body>Your password has been reset successfully.</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => router.push('/login')}>
            Return to Login
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}