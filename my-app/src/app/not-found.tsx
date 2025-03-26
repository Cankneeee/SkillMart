// not-found.tsx
import styles from '@/styles/not-found.module.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Not Found',
  description: 'Page not found',
  keywords: ['error', '404', 'not found']
};


export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>404</h1>
        <h2 className={styles.subtitle}>Page Not Found</h2>
        <p className={styles.message}>
          Sorry, we couldn't find the page you're looking for.
        </p>
        
        <Link href="/" className={styles.button}>
          Return to Home
        </Link>
      </div>
    </div>
  );
}