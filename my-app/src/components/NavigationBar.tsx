'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Navbar, Nav, Dropdown, Form, FormControl, Container } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';
import ImageSkeleton from './ImageSkeleton';
import { FaUserCircle, FaSearch, FaBars } from 'react-icons/fa';
import CategoriesTab from '@/components/CategoriesTab';
import { createClient } from '@/utils/supabase/client';
import styles from '@/styles/NavigationBar.module.css';
import { signOut } from '@/utils/auth';

export default function NavigationBar() {
  const { username, profilePicture } = useUser();
  const supabase = createClient();
  const router = useRouter();
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    signOut('/login');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only redirect if there's a search term
    if (searchQuery.trim()) {
      // Encode the search query for URL
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      router.push(`/browse?q=${encodedQuery}`);
      // Close mobile menu if open
      setExpanded(false);
    }
  };

  return (
    <>
      <Navbar 
        expand="lg" 
        className={styles.navbar} 
        expanded={expanded}
        onToggle={(expanded) => setExpanded(expanded)}
      >
        <Container fluid className={styles.navContainer}>
          {/* Brand always visible */}
          <Navbar.Brand as={Link} href="/" className={styles.brand}>
            SkillMart
          </Navbar.Brand>
          
          {/* Hamburger toggle for mobile */}
          <Navbar.Toggle aria-controls="responsive-navbar" className={styles.navbarToggle} />
          
          {/* Collapsible content */}
          <Navbar.Collapse id="responsive-navbar">
            <Nav className={`${styles.navLinks} me-auto`}>
              <Nav.Link className={styles.navLink} onClick={() => setShowOffcanvas(true)}>
                Explore
              </Nav.Link>
            </Nav>
            
            {/* Search form - will be properly positioned in mobile */}
            <Form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <div className={styles.searchContainer}>
                <FaSearch className={styles.searchIcon} />
                <FormControl 
                  placeholder="Search listings or users..." 
                  className={styles.searchBar} 
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </Form>
            
            {/* User controls section */}
            <Nav className={styles.rightSection}>
              {username ? (
                <Dropdown align="end" className="w-100">
                  <Dropdown.Toggle variant="light" className={styles.profileDropdown}>
                    <div className="d-flex align-items-center">
                      <span className={styles.username}>{username}</span>
                      {profilePicture ? (
                        <Suspense fallback={<ImageSkeleton className={styles.profilePicture} />}>
                          <Image
                            src={profilePicture || '/default-profile.png'}
                            alt="Profile Image"
                            className={styles.profilePicture}
                            width={40}  
                            height={40}
                            onError={() => {}}
                            priority // Above the fold - immediate navigation element
                          />
                        </Suspense>
                      ) : (
                        <FaUserCircle className={styles.profileIcon} />
                      )}
                    </div>
                  </Dropdown.Toggle>
                  <Dropdown.Menu className={styles.dropdownMenu}>
                    <Dropdown.Item as={Link} href="/profile" className={styles.dropdownItem}>
                      Profile
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} href="/saved-listings" className={styles.dropdownItem}>
                      Saved Listings
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} href="/my-listings" className={styles.dropdownItem}>
                      My Listings
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout} className={styles.dropdownItem}>
                      Log Out
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ) : (
                <>
                  <Nav.Link as={Link} href="/login" className={styles.navLink}>
                    Log In
                  </Nav.Link>
                  <Nav.Link as={Link} href="/signup" className={`btn ${styles.btnSignup}`}>
                    Sign Up
                  </Nav.Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <CategoriesTab show={showOffcanvas} onClose={() => setShowOffcanvas(false)} />
    </>
  );
}