'use client';

import { useState, Suspense, useEffect } from 'react';
// Import usePathname
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Navbar, Nav, Dropdown, Form, FormControl, Container } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';
import ImageSkeleton from './ImageSkeleton';
import { FaUserCircle, FaSearch, FaBars } from 'react-icons/fa';
import CategoriesTab from '@/components/CategoriesTab';
import { createClient } from '@/utils/supabase/client';
import styles from '@/styles/NavigationBar.module.css';
import { signOut } from '@/utils/auth'; // Assuming signOut is still in auth.ts

export default function NavigationBar() {
  const { userId, username, profilePicture, loadingProfile } = useUser();
  const supabase = createClient();
  const router = useRouter();
  // Get pathname hook
  const pathname = usePathname();
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    if (!loadingProfile) {
      setIsClientReady(true);
    }
  }, [loadingProfile]);

  // --- MODIFIED: handleLogout with window.location.reload ---
  const handleLogout = async () => {
    console.log("NavigationBar: Logout initiated...");
    await signOut(); // Call the utility function (which only signs out)
    setExpanded(false); // Close mobile menu if open
    console.log("NavigationBar: SignOut complete. Current path:", pathname);

    // Define routes that should redirect to home
    const routesRedirectToHome = [
      '/profile',
      '/my-listings',
      '/saved-listings'
    ];
    const routePatternsRedirectToHome = [
        /^\/my-listings\/category\/.+/, // Matches /my-listings/category/*
        /^\/saved-listings\/category\/.+/ // Matches /saved-listings/category/*
    ];

    // Define routes that should refresh (now using full reload)
    const routePatternsRefresh = [
        /^\/listing\/.+/ // Matches /listing/*
    ];

    // Check if current path should redirect to home
    const shouldRedirectToHome = routesRedirectToHome.includes(pathname) ||
                                 routePatternsRedirectToHome.some(pattern => pattern.test(pathname));

    // Check if current path should refresh
    const shouldRefresh = routePatternsRefresh.some(pattern => pattern.test(pathname));

    if (shouldRedirectToHome) {
      console.log("NavigationBar: On protected route, redirecting to home...");
      router.push('/'); // Redirect to home page
    } else if (shouldRefresh) {
      console.log("NavigationBar: On listing page, performing full page reload...");
      // Force a full page reload for listing pages
      window.location.reload();
    } else {
      console.log("NavigationBar: On other page, only updating state (no redirect/refresh).");
      // Do nothing for other pages (like /browse, /)
    }
  };
  // --- END MODIFICATION ---


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      router.push(`/browse?q=${encodedQuery}`);
      setExpanded(false);
    }
  };

  if (!isClientReady) {
     return (
         <Navbar expand="lg" className={styles.navbar} expanded={false}>
             <Container fluid className={styles.navContainer}>
                 <Navbar.Brand as={Link} href="/" className={styles.brand}>
                     SkillMart
                 </Navbar.Brand>
             </Container>
         </Navbar>
     );
  }

  return (
    <>
      <Navbar
        expand="lg"
        className={styles.navbar}
        expanded={expanded}
        onToggle={(expanded) => setExpanded(expanded)}
      >
        <Container fluid className={styles.navContainer}>
          <Navbar.Brand as={Link} href="/" className={styles.brand}>
           SkillMart
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="responsive-navbar" className={styles.navbarToggle} />

          <Navbar.Collapse id="responsive-navbar">
            <div className={styles.desktopElements}>
              <Nav className={`${styles.navLinks} me-auto`}>
                <Nav.Link className={styles.navLink} onClick={() => setShowOffcanvas(true)}>
                  Explore
                </Nav.Link>
              </Nav>

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

              <Nav className={styles.rightSection}>
                {username ? (
                  <Dropdown align="end">
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
                              priority
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
            </div>

            {/* Mobile elements remain the same */}
            <div className={styles.mobileElements}>
              <Form className={styles.mobileSearchForm} onSubmit={handleSearchSubmit}>
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

              <Nav.Link
                className={styles.mobileActionButton}
                onClick={() => {
                  setShowOffcanvas(true);
                  setExpanded(false);
                }}
              >
                Explore
              </Nav.Link>

              {username ? (
                <div className={styles.mobileProfileContainer}>
                  <Dropdown className="w-100">
                    <Dropdown.Toggle
                      as="div"
                      id="mobile-profile-dropdown"
                      className={styles.mobileProfileButton}
                    >
                      <div className="d-flex align-items-center justify-content-center">
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
                              priority
                            />
                          </Suspense>
                        ) : (
                          <FaUserCircle
                            className={styles.profileIcon} />
                        )}
                      </div>
                    </Dropdown.Toggle>

                    <Dropdown.Menu className={styles.mobileDropdownMenu}>
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
                </div>
              ) : (
                <>
                  <Nav.Link as={Link} href="/login" className={styles.mobileActionButton}>
                    Log In
                  </Nav.Link>
                  <Nav.Link as={Link} href="/signup" className={styles.mobileSignupButton}>
                   Sign Up
                  </Nav.Link>
                </>
              )}
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <CategoriesTab show={showOffcanvas} onClose={() => setShowOffcanvas(false)} />
    </>
  );
}