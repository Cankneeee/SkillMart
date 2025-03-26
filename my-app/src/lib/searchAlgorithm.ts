import { createClient } from "@/utils/supabase/client";
import { Listing } from "@/lib/database";

const supabase = createClient();

/**
 * Simplified search function that focuses on basic listing fields only
 * @param searchQuery - The search query string
 * @param listingType - Optional filter by listing type
 * @param category - Optional filter by category
 * @returns Array of listings matching the search query and filters
 */
export const searchListings = async (
  searchQuery: string,
  listingType?: string,
  category?: string
): Promise<Listing[]> => {
  try {
    // Log search parameters for debugging
    console.log('Search params:', { searchQuery, listingType, category });
    
    // Clean and normalize the search query
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    // Split the query into terms for better matching
    const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 1);
    
    // If no valid search terms, return empty array
    if (searchTerms.length === 0) {
      console.log('No valid search terms');
      return [];
    }
    
    console.log('Searching with terms:', searchTerms);
    
    // Use a simpler approach: search by title, description, and creator username
    let allResults: Listing[] = [];
    const seenIds = new Set<string>();
    
    // Function to add unique results to our collection
    const addUniqueResults = (results: any[]) => {
      if (!results) return;
      
      for (const result of results) {
        if (!seenIds.has(result.id)) {
          allResults.push(result);
          seenIds.add(result.id);
        }
      }
    };
    
    // Search by title
    for (const term of searchTerms) {
      const fuzzyTerm = `%${term}%`;
      
      try {
        let query = supabase
          .from('listings')
          .select('*')
          .ilike('title', fuzzyTerm);
        
        if (listingType && listingType !== 'All Types') {
          query = query.eq('listing_type', listingType);
        }
        
        if (category) {
          query = query.eq('category', category);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Title search error:', JSON.stringify(error));
        } else {
          console.log(`Found ${data?.length || 0} results for term "${term}" in titles`);
          addUniqueResults(data || []);
        }
      } catch (err) {
        console.error('Exception in title search:', err);
      }
    }
    
    // Search by description
    for (const term of searchTerms) {
      const fuzzyTerm = `%${term}%`;
      
      try {
        let query = supabase
          .from('listings')
          .select('*')
          .ilike('description', fuzzyTerm);
        
        if (listingType && listingType !== 'All Types') {
          query = query.eq('listing_type', listingType);
        }
        
        if (category) {
          query = query.eq('category', category);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Description search error:', JSON.stringify(error));
        } else {
          console.log(`Found ${data?.length || 0} results for term "${term}" in descriptions`);
          addUniqueResults(data || []);
        }
      } catch (err) {
        console.error('Exception in description search:', err);
      }
    }
    
    // Search by username (using a two-step approach to avoid joins)
    for (const term of searchTerms) {
      const fuzzyTerm = `%${term}%`;
      
      try {
        // Step 1: Find profiles matching the search term
        const { data: matchingProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', fuzzyTerm);
        
        if (profileError) {
          console.error('Username search error:', JSON.stringify(profileError));
          continue;
        }
        
        if (!matchingProfiles || matchingProfiles.length === 0) {
          console.log(`No profiles found matching "${term}"`);
          continue;
        }
        
        // Extract the user IDs from matching profiles
        const userIds = matchingProfiles.map(profile => profile.id);
        console.log(`Found ${userIds.length} profiles matching "${term}"`);
        
        // Step 2: Find listings created by these users
        let query = supabase
          .from('listings')
          .select('*')
          .in('user_id', userIds);
        
        if (listingType && listingType !== 'All Types') {
          query = query.eq('listing_type', listingType);
        }
        
        if (category) {
          query = query.eq('category', category);
        }
        
        const { data: userListings, error: listingsError } = await query;
        
        if (listingsError) {
          console.error('User listings search error:', JSON.stringify(listingsError));
        } else {
          console.log(`Found ${userListings?.length || 0} listings from users matching "${term}"`);
          addUniqueResults(userListings || []);
        }
      } catch (err) {
        console.error('Exception in username search:', err);
      }
    }
    
    // Sort results by relevance (simple version)
    allResults.sort((a, b) => {
      const aTitle = a.title?.toLowerCase() || '';
      const bTitle = b.title?.toLowerCase() || '';
      
      // Prioritize exact matches in title
      if (aTitle === normalizedQuery && bTitle !== normalizedQuery) return -1;
      if (bTitle === normalizedQuery && aTitle !== normalizedQuery) return 1;
      
      // Then partial matches in title
      if (aTitle.includes(normalizedQuery) && !bTitle.includes(normalizedQuery)) return -1;
      if (bTitle.includes(normalizedQuery) && !aTitle.includes(normalizedQuery)) return 1;
      
      // Default to most recently created
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    console.log(`Found ${allResults.length} total results for search: "${searchQuery}"`);
    
    return allResults;
    
  } catch (err: unknown) {
    console.error('Search Error:', {
      error: err,
      type: typeof err,
      stringified: err ? String(err) : 'No error information'
    });
    return [];
  }
};

/**
 * Search users by username or full name (simplified)
 * @param searchQuery - The search query string
 * @returns Array of user profiles matching the search query
 */
export const searchUsers = async (searchQuery: string): Promise<any[]> => {
  try {
    // Clean and normalize the search query
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    // If no valid search term, return empty array
    if (normalizedQuery.length < 2) {
      return [];
    }
    
    const fuzzyTerm = `%${normalizedQuery}%`;
    
    // Simple username search
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, profile_picture, full_name')
      .or(`username.ilike.${fuzzyTerm},full_name.ilike.${fuzzyTerm}`);
    
    if (error) {
      console.error('Error searching users:', JSON.stringify(error));
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error in searchUsers:', err);
    return [];
  }
};