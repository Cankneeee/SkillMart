import Link from 'next/link';
import styles from '@/styles/HeroSection.module.css';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <h1>
          Unlock Your Potential with <span className={styles.highlight}>SkillMart</span>
        </h1>
        <p>Learn, Share, and Trade Skills with a Thriving Community.</p>
        <p className={styles.description}>
          SkillMart is a marketplace where passionate individuals connect to exchange knowledge and services. 
          Whether you want to teach, learn, or collaborate, this is your go-to hub for skill-sharing.
        </p>
        <Link href="/signup">
          <button className={styles.ctaButton}>Get Started Now</button>
        </Link>
      </div>
    </section>
  );
}