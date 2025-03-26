'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/error.module.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Error',
  description: 'Page Something went wrong!',
  keywords: ['error']
};


export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Something went wrong!</h1>
        <p className={styles.message}>We apologize for the inconvenience. An unexpected error has occurred.</p>
        
        {error.digest && (
          <p className={styles.errorId}>
            Error ID: {error.digest}
          </p>
        )}
        
        <div className={styles.buttonContainer}>
          <button
            onClick={() => reset()}
            className={styles.button}
          >
            Try again
          </button>
          
          <Link href="/" className={styles.button}>
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Add this to your CSS or as a <style> tag
// .hover-button:hover {
//   background-color: var(--hover-button) !important;
// }