import styles from '@/styles/loading.module.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Loading',
  description: 'Page is loading',
  keywords: ['loading']
};


export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.spinner}>
          <div className={styles.spinnerCircle}></div>
        </div>
        <h2 className={styles.title}>Loading...</h2>
        <p className={styles.subtitle}>
          Please wait while we prepare your content.
        </p>
      </div>
    </div>
  );
}