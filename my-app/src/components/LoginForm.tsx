'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, redirectIfAuthenticated, isEmailRegistered } from '@/utils/auth';
import styles from '@/styles/AuthForms.module.css';
import { User } from '@supabase/supabase-js';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    // Check if user is already logged in and redirect if needed
    redirectIfAuthenticated(router);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailError(false);
    setPasswordError(false);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Check if email exists
      const emailExists = await isEmailRegistered(normalizedEmail);

      if (!emailExists) {
        setError('Email is not registered.');
        setEmailError(true);
        setLoading(false);
        return;
      }

      // Sign in user
      const { data, error } = await signInWithEmail(normalizedEmail, password);

      if (error) {
        setError('Incorrect password. Please try again.');
        setPasswordError(true);
      } else {
        console.log("Login successful, redirecting...");
        router.push('/browse');
      }
    } catch (err) {
      console.error("Unexpected error during login:", err);
      setError('An error occurred. Please try again later.');
    }

    setLoading(false);
  };

  return user ? null : (
    <div className={styles.container}>
      <h2 className={styles.heading}>Log In</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="Email"
          className={`${styles.input} ${emailError ? styles.inputError : ''}`}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(false);
            setError(null);
          }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setPasswordError(false);
            setError(null);
          }}
          required
        />
        {error && <p className={styles.errorMessage}>{error}</p>}
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
        <p className={styles.link}>
          <Link href="/forget-password">Forgot Password?</Link>
        </p>
        <p className={styles.link}>
          Don't have an account? <Link href="/signup">Sign Up</Link>
        </p>
      </form>
    </div>
  );
}