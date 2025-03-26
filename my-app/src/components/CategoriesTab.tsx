'use client';

import { useEffect } from 'react';
import { Offcanvas, Nav } from 'react-bootstrap';
import Link from 'next/link';
import styles from '@/styles/CategoriesTab.module.css';

interface CategoriesTabProps {
  show: boolean;
  onClose: () => void;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ show, onClose }) => {
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (show) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('click', handleOutsideClick);
    } else {
      document.removeEventListener('click', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [show, onClose]);

  const categories = [
    'Business',
    'Finance & Accounting',
    'IT & Software',
    'Office Productivity',
    'Personal Development',
    'Design',
    'Arts', // Added Arts as a separate category
    'Marketing',
    'Lifestyle',
    'Photography & Video',
    'Health & Fitness',
    'Music',
    'Sports', // Added Sports as a separate category
    'Teaching & Academics',
  ];

  return (
    <Offcanvas show={show} onHide={onClose} placement="start" className={styles.offcanvas}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title className={styles.offcanvasTitle}>Explore Categories</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Nav className={styles.offcanvasNav}>
          <Nav.Link as={Link} href="/browse" className={styles.offcanvasLink} onClick={onClose}>
            All
          </Nav.Link>
          {categories.map((category, index) => (
            <Nav.Link
              key={index}
              as={Link}
              href={`/browse/category/${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
              className={styles.offcanvasLink}
              onClick={onClose}
            >
              {category}
            </Nav.Link>
          ))}
        </Nav>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default CategoriesTab;