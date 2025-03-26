'use client';

import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { resetPassword, isEmailRegistered } from '@/utils/auth';
import styles from '@/styles/AuthForms.module.css'; 
import modalStyles from '@/styles/Modal.module.css';

export default function ForgetPasswordForm() {
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if the email exists
      const emailExists = await isEmailRegistered(email.trim().toLowerCase());

      if (!emailExists) {
        setError('Email is not registered.');
        setLoading(false);
        return;
      }

      // Use the reset password utility
      const { error: resetError } = await resetPassword(
        email.trim().toLowerCase(), 
        'http://localhost:3000/reset-password'
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setShowModal(true);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Reset Password</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="Enter your email"
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          required
        />
        {error && <p className={styles.errorMessage}>{error}</p>}
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {/* Updated Modal with standardized styling */}
      <Modal show={showModal} onHide={() => setShowModal(false)} className={modalStyles.modal}>
        <Modal.Header closeButton>
          <Modal.Title>Check Your Email</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          A password reset link has been sent to your email. Please check your inbox.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}