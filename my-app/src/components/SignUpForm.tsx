'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithEmail, isEmailRegistered } from '@/utils/auth';
import { updateUserProfile } from '@/lib/database';
import styles from '@/styles/AuthForms.module.css';

// Form state type
interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Form errors type
interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string; // General form error
}

export default function SignUpForm() {
  const router = useRouter();
  
  // Form state
  const [values, setValues] = useState<FormState>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Form errors
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Loading state
  const [loading, setLoading] = useState(false);
  
  // Handle input changes and clear errors
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormErrors];
        return newErrors;
      });
    }
  };
  
  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate username
    if (!values.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    // Validate email
    if (!values.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    // Validate password
    if (!values.password) {
      newErrors.password = 'Password is required';
    } else if (values.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Validate password match
    if (values.password !== values.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Validate form fields
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if email is already registered
      const emailExists = await isEmailRegistered(values.email.trim().toLowerCase());
      
      if (emailExists) {
        setErrors({ email: 'Email is already registered. Please log in.' });
        return;
      }
      
      // Use sign up utility
      const { data, error: signupError } = await signUpWithEmail(
        values.email, 
        values.password
      );
      
      if (signupError) {
        setErrors({ email: signupError.message });
        return;
      }
      
      // Extract userId from the signup response
      const userId = data?.user?.id;
      if (userId) {
        await updateUserProfile(userId, {
          email: values.email,
          username: values.username,
          profile_picture: undefined,
        });
      }
      
      // Redirect to browse page after successful sign-up
      router.push('/browse');
    } catch (err: any) {
      console.error('Error during sign up:', err);
      setErrors({ form: err.message || 'An unexpected error occurred during sign up.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Sign Up</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
          value={values.username}
          onChange={handleChange}
          required
        />
        {errors.username && <p className={styles.errorMessage}>{errors.username}</p>}
        
        <input
          type="email"
          name="email"
          placeholder="Email"
          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
          value={values.email}
          onChange={handleChange}
          required
        />
        {errors.email && <p className={styles.errorMessage}>{errors.email}</p>}
        
        <input
          type="password"
          name="password"
          placeholder="Password"
          className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
          value={values.password}
          onChange={handleChange}
          required
        />
        {errors.password && <p className={styles.errorMessage}>{errors.password}</p>}
        
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
          value={values.confirmPassword}
          onChange={handleChange}
          required
        />
        {errors.confirmPassword && <p className={styles.errorMessage}>{errors.confirmPassword}</p>}
        
        {errors.form && <p className={styles.errorMessage}>{errors.form}</p>}
        
        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
        <p className={styles.link}>
          Already have an account? <Link href="/login">Log In</Link>
        </p>
      </form>
    </div>
  );
}