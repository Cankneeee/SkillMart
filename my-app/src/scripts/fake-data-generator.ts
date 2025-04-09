// src/scripts/fake-data-generator.ts

// --- Base Imports ---
import { resolve } from 'path';
import * as dotenv from 'dotenv';
// --- Supabase Imports ---
import { createClient, SupabaseClient, PostgrestError, AuthError } from '@supabase/supabase-js';
// --- OpenAI Imports ---
import { OpenAI } from 'openai';
import { EmbeddingCreateParams } from 'openai/resources/embeddings';

// --- Load Environment Variables ---
// Load from .env.local in the project root
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// --- Environment Variable Checks ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service key needed for admin actions
const openaiApiKey = process.env.OPENAI_API_KEY;

// Validate that all necessary environment variables are set
if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  const missingVars = [
    !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
    !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !openaiApiKey && 'OPENAI_API_KEY',
  ].filter(Boolean).join(', ');
  throw new Error(`Missing required environment variables: ${missingVars}. Check .env.local`);
}

console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey.substring(0, 5) + '...');
console.log('OPENAI_API_KEY:', openaiApiKey.substring(0, 5) + '...');

// --- Initialize Clients ---
// Supabase Client (using Service Role Key)
const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// OpenAI Client
const openai = new OpenAI({ apiKey: openaiApiKey });

// --- Type Definitions ---
// Based on the user's provided script structure
type FakeUserData = {
  id: string;       // This ID MUST match an existing user in auth.users
  email: string;
  username: string;
  password?: string; // Add password field ONLY IF the script needs to CREATE auth users
};

type FakeListingData = {
  title: string;
  description: string;
  listing_type: 'Providing Skills' | 'Looking for Skills' | 'Trading Skills';
  category: string;
  price?: number;   // Optional price
  user_id: string;  // Foreign key to auth.users.id
};

type FakeReviewData = {
  rating: number;   // Should be 1-5
  comment: string;
  user_id: string;  // Foreign key to auth.users.id
  listing_id: string; // Foreign key to listings.id
};

// Basic interfaces for expected DB return shapes
interface Listing { id: string; title: string; description: string; category: string; listing_type: string; price?: number | null; [key: string]: any; }
interface Review { id: string; comment?: string | null; rating: number; [key: string]: any; } // Added rating here
interface Profile { id: string; email: string; username: string; [key: string]: any; }


// --- Data Definitions ---
// ** IMPORTANT: Paste your specific data arrays/objects below **
// These user IDs MUST already exist in your Supabase Auth table (auth.users).
// Add a temporary 'password' field only if you need the script to *create* these users.
const users: FakeUserData[] = [
  { id: 'acc7aafe-be13-42fd-bcca-d29367bf47a4', email: 'testuser0@gmail.com', username: 'TestUser0', password: 'Password123!' },
  { id: '90835727-6393-49a9-86dd-8d11b2982b85', email: 'testuser1@gmail.com', username: 'TestUser1', password: 'Password123!' },
  { id: '044b1a15-beac-4dbb-b77f-a54a416e5e34', email: 'testuser2@gmail.com', username: 'TestUser2', password: 'Password123!' },
  { id: '16625624-356c-4c4d-9395-1ec2cd22e3a3', email: 'testuser3@gmail.com', username: 'TestUser3', password: 'Password123!' },
  { id: '42814b79-a291-4038-9bec-c5b1a81da50e', email: 'testuser4@gmail.com', username: 'TestUser4', password: 'Password123!' },
  { id: 'f39840fe-c89e-4d51-a175-fd535f8f793e', email: 'testuser5@gmail.com', username: 'TestUser5', password: 'Password123!' },
  { id: '81149c20-21eb-4620-a53f-b2acec58d651', email: 'testuser6@gmail.com', username: 'TestUser6', password: 'Password123!' },
  { id: '6d20608d-f1f7-46e7-8a09-72440c37fd62', email: 'testuser7@gmail.com', username: 'TestUser7', password: 'Password123!' },
  { id: 'fff570f1-ee51-4c49-b4bb-336ae1940ea0', email: 'testuser8@gmail.com', username: 'TestUser8', password: 'Password123!' },
  { id: '641a5f43-f6d2-478e-b60d-bf9730deb9e1', email: 'testuse9@gmail.com', username: 'TestUser9', password: 'Password123!' },
];

// --- EXPANDED LISTING TEMPLATES ---
const listingTemplates = [
  // Existing
  { title: "{skill} Services by {username}", description: "Experienced {skill} professional offering high-quality services. I have {years} years of experience and specialize in {specialty}. My approach focuses on {approach}, ensuring you get the best results. Contact me for a free consultation!", listing_type: "Providing Skills" },
  { title: "Looking for {skill} Expert", description: "I need help with {problem}. Seeking someone experienced in {skill} who can assist with this project. My budget is flexible for the right expertise. Ideal candidate will have knowledge of {tools} and experience with {specialty}.", listing_type: "Looking for Skills" },
  { title: "Trading {skill1} for {skill2}", description: "I'm offering my expertise in {skill1} in exchange for help with {skill2}. I can provide {offering} and would like to receive {receiving} in return. This is a great opportunity for skills exchange and mutual growth.", listing_type: "Trading Skills" },
  { title: "Affordable {skill} Lessons", description: "Learn {skill} from an experienced instructor. I offer personalized lessons for all levels, from beginner to advanced. My teaching method emphasizes {approach}, and I provide {materials}. Sessions available online or in-person.", listing_type: "Providing Skills" },
  { title: "Professional {skill} Consultant", description: "Strategic {skill} consulting to help you achieve your goals. I provide comprehensive analysis, actionable recommendations, and implementation support. My expertise includes {specialty1}, {specialty2}, and {specialty3}. Proven track record of success.", listing_type: "Providing Skills" },
  // New Templates
  { title: "Project: {skill} Development Needed", description: "Looking for a skilled professional in {skill} to complete a project involving {problem}. The scope includes {specialty1} and {specialty2}. Please provide portfolio examples and estimated timeline.", listing_type: "Looking for Skills" },
  { title: "{skill} Mentorship Program", description: "Offering personalized mentorship in {skill} for aspiring professionals. With {years} years in the field, I can guide you through {specialty1}, {specialty2}, and career development. Limited spots available.", listing_type: "Providing Skills" },
  { title: "Need Help with {tools} Software", description: "Seeking an expert in {tools} to provide training/support for {problem}. Must have advanced knowledge and practical experience. Please detail your proficiency.", listing_type: "Looking for Skills" },
  { title: "Creative Collaboration: {skill1} + {skill2}", description: "I'm a {skill1} specialist looking to collaborate with someone skilled in {skill2} on an exciting new project. Let's combine our talents! Offering {offering} in exchange for {receiving}.", listing_type: "Trading Skills" },
  { title: "Workshop: Introduction to {skill}", description: "Hosting an online workshop covering the fundamentals of {skill}. Perfect for beginners! Learn {specialty1}, {specialty2}, and practical {approach} techniques. Date: {date_placeholder}. Sign up now!", listing_type: "Providing Skills" },
  { title: "Urgent: {skill} Problem Solver Needed", description: "Facing a critical issue related to {problem} and need immediate {skill} expertise. Requires deep knowledge of {specialty}. Offering competitive rate for fast turnaround.", listing_type: "Looking for Skills" },
  { title: "Custom {skill} Solutions", description: "Providing bespoke {skill} solutions tailored to your specific needs. Expertise in {specialty1}, {specialty2}, and integrating with {tools}. Let's discuss how I can help your project succeed.", listing_type: "Providing Skills" },
] as Array<{ title: string; description: string; listing_type: FakeListingData['listing_type']; }>;

// --- EXPANDED CATEGORY SKILLS ---
const categorySkills: Record<string, string[]> = {
  "Business": ["Business Strategy", "Project Management", "Entrepreneurship", "Operational Efficiency", "Team Leadership", "Market Research", "Business Plan Writing", "Negotiation Skills", "Sales Training"],
  "Finance & Accounting": ["Financial Analysis", "Bookkeeping", "Tax Planning", "Investment Strategy", "Financial Modeling", "Risk Management", "QuickBooks", "Forensic Accounting", "Payroll Services"],
  "IT & Software": ["Web Development", "Mobile App Development", "Software Engineering", "Cloud Architecture", "DevOps", "Cybersecurity", "Database Management", "Python Programming", "JavaScript Frameworks", "Network Administration"],
  "Office Productivity": ["Microsoft Excel", "Google Workspace", "Data Entry", "Virtual Assistance", "Presentation Design", "Microsoft PowerPoint", "Slack Administration", "Notion Setup"],
  "Personal Development": ["Life Coaching", "Time Management", "Public Speaking", "Mindfulness", "Goal Setting", "Career Coaching", "Communication Skills", "Emotional Intelligence", "Leadership Training"],
  "Design": ["Graphic Design", "UI/UX Design", "Brand Identity", "Illustration", "Motion Graphics", "Logo Design", "Adobe Photoshop", "Figma Prototyping", "Web Design"],
  "Art": ["Painting", "Drawing", "Sculpture", "Digital Art", "Mixed Media", "Pottery", "Printmaking", "Art History Tutoring", "Calligraphy"],
  "Marketing": ["Digital Marketing", "Content Strategy", "Social Media Management", "SEO", "Email Marketing", "PPC Advertising", "Brand Strategy", "Copywriting", "Marketing Analytics"],
  "Lifestyle": ["Interior Design", "Culinary Arts", "Event Planning", "Fashion Styling", "Sustainable Living", "Gardening Advice", "Personal Organization", "Travel Planning", "Pet Care Tips"],
  "Photography & Video": ["Portrait Photography", "Videography", "Photo Editing", "Cinematography", "Drone Photography", "Wedding Photography", "Product Photography", "Video Editing (Premiere Pro)", "Animation"],
  "Health & Fitness": ["Personal Training", "Nutrition Planning", "Yoga Instruction", "Fitness Assessment", "Wellness Coaching", "Meditation Guidance", "Strength Training", "Pilates Classes", "Sports Massage"],
  "Music": ["Music Production", "Instrument Lessons (Guitar, Piano, etc.)", "Vocal Coaching", "Songwriting", "Audio Engineering", "Music Theory Tutoring", "DJ Lessons", "Mixing and Mastering"],
  "Sports": ["Sports Coaching (Soccer, Basketball, etc.)", "Performance Training", "Technique Analysis", "Athletic Development", "Game Strategy", "Sports Psychology", "Yoga for Athletes", "Referee Training"],
  "Teaching & Academics": ["Tutoring (Math, Science, etc.)", "Curriculum Development", "Research Assistance", "Language Teaching (Spanish, French, etc.)", "Test Preparation (SAT, GRE)", "Academic Writing Support", "Thesis Advising", "Online Course Creation"]
};

const reviewTemplates = [
    { comment: "Excellent service! {username} was professional, responsive, and delivered exactly what I needed. The quality of work exceeded my expectations. Highly recommend!", ratingRange: [4, 5] as [number, number] },
    { comment: "Very knowledgeable about {skill}. {username} explained everything clearly and was patient with my questions. The process was smooth from start to finish.", ratingRange: [4, 5] as [number, number] },
    { comment: "Good experience overall. {username} provided solid expertise in {skill}, though there were some minor communication delays. Would use their services again.", ratingRange: [3, 4] as [number, number] },
    { comment: "Average service. While {username} has knowledge in {skill}, the delivery was slightly below my expectations. Some improvements needed in terms of timeliness.", ratingRange: [2, 3] as [number, number] },
    { comment: "Unfortunately, my experience wasn't great. {username} seemed to lack depth in {skill}, and the deliverables required multiple revisions. Communication could be improved.", ratingRange: [1, 2] as [number, number] },
    { comment: "I learned so much about {skill} from {username}! Their teaching style made complex concepts easy to understand. Definitely worth the investment.", ratingRange: [4, 5] as [number, number] },
    { comment: "A true expert in {skill}. {username} provided invaluable insights that helped me solve my problem quickly. Fast response time and excellent follow-up.", ratingRange: [4, 5] as [number, number] },
    { comment: "The quality of {username}'s work was inconsistent. Some aspects of the {skill} service were excellent, while others needed improvement. Mixed feelings overall.", ratingRange: [2, 4] as [number, number] }
];


// --- Helper Functions ---
// Safer getRandomItem included
function getRandomItem<T>(array: T[], defaultValue?: T): T {
    if (!array || array.length === 0) {
        if (defaultValue !== undefined) return defaultValue;
        throw new Error("getRandomItem called with an empty array and no default value provided.");
    }
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomInRange(range: [number, number]): number {
    return getRandomNumber(range[0], range[1]);
}
function getRandomPrice(min: number = 25, max: number = 150): number {
    return getRandomNumber(min, max);
}
function fillTemplate(template: string, replacements: Record<string, string | number>): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        // Add a placeholder for date if needed
        if (key === 'date_placeholder') {
             const futureDate = new Date();
             futureDate.setDate(futureDate.getDate() + getRandomNumber(7, 30)); // 1-4 weeks in the future
             result = result.replace(`{${key}}`, futureDate.toLocaleDateString());
        } else {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
    }
    return result;
}


// --- Data Generation Functions (With "Empty Array" Fix & Category Override) ---
/**
 * Generates fake listing data for a specific user and category.
 * @param userId - The ID of the user creating the listing.
 * @param username - The username of the user creating the listing.
 * @param category - The specific category for this listing.
 * @returns Fake listing data object.
 */
function generateFakeListing(userId: string, username: string, category: string): FakeListingData {
    const template = getRandomItem(listingTemplates); // Choose a random template structure
    const categorySkillList = categorySkills[category];
    const skills = (categorySkillList && categorySkillList.length > 0) ? categorySkillList : ['general services'];

    // Safely generate skill2 from a random category
    const randomCategoryKey = getRandomItem(Object.keys(categorySkills));
    let skill2List = categorySkills[randomCategoryKey] ?? [];
    if (skill2List.length === 0) skill2List = ['general skill'];
    const skill2 = getRandomItem(skill2List);

    const replacements: Record<string, string | number> = {
        username,
        skill: getRandomItem(skills, 'default skill'), // Use skills from the specified category
        skill1: getRandomItem(skills, 'related skill'), // Use skills from the specified category
        skill2: skill2,
        years: getRandomNumber(1, 15),
        specialty: getRandomItem(skills, 'core specialty'), // Use skills from the specified category
        specialty1: getRandomItem(skills, 'spec 1'), // Use skills from the specified category
        specialty2: getRandomItem(skills, 'spec 2'), // Use skills from the specified category
        specialty3: getRandomItem(skills, 'spec 3'), // Use skills from the specified category
        approach: getRandomItem(["practical", "theoretical", "hands-on", "results-driven", "collaborative"], "practical"),
        tools: getRandomItem(["standard software", "latest tech", "custom tools", "industry-specific platforms", "open-source alternatives"], "standard software"),
        problem: getRandomItem(["complex projects", "specific technical issues", "strategic business goals", "creative blocks", "learning challenges"], "specific issues"),
        offering: getRandomItem(["consultations", "full project delivery", "training sessions", "custom development", "strategic guidance"], "consultations"),
        receiving: getRandomItem(["technical assistance", "creative input", "strategic advice", "domain expertise", "design feedback"], "assistance"),
        materials: getRandomItem(["detailed resources", "practical exercises", "constructive feedback", "real-world examples", "video tutorials"], "resources"),
        date_placeholder: '' // Placeholder, will be filled by fillTemplate helper
    };

    const price: number | undefined = template.listing_type !== "Trading Skills" ? getRandomPrice() : undefined;

    return {
        title: fillTemplate(template.title, replacements),
        description: fillTemplate(template.description, replacements),
        listing_type: template.listing_type,
        category, // Use the provided category
        price: price ?? undefined, // Use undefined for optional number
        user_id: userId
    };
}

function generateFakeReview(userId: string, username: string, listingId: string, listingOwnerUserId: string, skill: string): FakeReviewData | null {
    if (userId === listingOwnerUserId) return null;
    const template = getRandomItem(reviewTemplates);
    const rating = Math.max(1, Math.min(5, getRandomInRange(template.ratingRange)));
    const ownerUsername = users.find(u => u.id === listingOwnerUserId)?.username || 'the owner';
    const replacements = { username: ownerUsername, skill };
    return {
        user_id: userId, listing_id: listingId, rating,
        comment: fillTemplate(template.comment, replacements)
    };
}


// --- Function to Generate and Store Embedding ---
async function generateAndStoreEmbedding(
    type: 'listing' | 'review',
    id: string,
    text: string | null | undefined
): Promise<void> {
    if (!text || text.trim() === "") {
        // console.warn(` -> Skipping embedding for ${type} ${id}: No text.`);
        return;
    }
    try {
        const params: EmbeddingCreateParams = { model: "text-embedding-3-small", input: text };
        const embeddingResponse = await openai.embeddings.create(params);
        const embeddingVector = embeddingResponse?.data?.[0]?.embedding;
        if (!embeddingVector || !Array.isArray(embeddingVector)) throw new Error('Invalid embedding vector.');

        const tableName = type === 'listing' ? 'listing_embeddings' : 'review_embeddings';
        const { error: storeError } = await supabase.rpc('store_embedding', {
            p_table_name: tableName, p_id: id, p_embedding: embeddingVector as any
        });
        if (storeError) throw storeError;
        // console.log(` -> Stored embedding for ${type} ${id}`);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        // Reduce noise: log only if it's not a common rate limit error
        if (!message.includes('rate limit')) {
             console.error(` -> Error embedding ${type} ${id}: ${message.substring(0, 100)}...`);
        } else {
             console.warn(` -> Rate limit hit for embedding ${type} ${id}. Skipping.`);
        }
    }
}


// --- Original Database Interaction Functions (Modified to call embedding) ---
// These match the structure provided by the user
async function createListing(listingData: FakeListingData): Promise<Listing | null> {
    try {
        const { data, error } = await supabase
            .from('listings')
            .insert(listingData as any) // Using original structure
            .select()
            .single();
        if (error) throw error;
        if (!data) return null;
        const listing = data as Listing;

        // Prepare text and call embedding function (async)
        const listingText = `Title: ${listing.title}\nDescription: ${listing.description}\nCategory: ${listing.category}\nType: ${listing.listing_type}\nPrice: ${listing.price ?? 'N/A'}`;
        generateAndStoreEmbedding('listing', listing.id, listingText).catch(e => console.error("Embed Err L:", e));

        return listing;
    } catch (error: unknown) {
        const message = error instanceof PostgrestError ? `DB (${error.code}): ${error.message}` : String(error);
        console.error(`Error creating listing "${listingData.title}": ${message}`);
        return null;
    }
}

async function createReview(reviewData: FakeReviewData): Promise<Review | null> {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .insert(reviewData as any) // Using original structure
            .select()
            .single();
        if (error) throw error;
        if (!data) return null;
        const review = data as Review;

        // Call embedding function if comment exists (async)
        if (review.comment) generateAndStoreEmbedding('review', review.id, review.comment).catch(e => console.error("Embed Err R:", e));

        return review;
    } catch (error: unknown) {
        const message = error instanceof PostgrestError ? `DB (${error.code}): ${error.message}` : String(error);
        // Avoid logging expected "duplicate key" or "already reviewed" errors if RLS/constraints handle it
        if (!message.includes('duplicate key value violates unique constraint') && !message.includes('already reviewed')) {
            console.error(`Error creating review for L-${reviewData.listing_id}: ${message}`);
        }
        return null;
    }
}


// --- Profile Existence Check Function (Simplified) ---
// Assumes the user IDs in the 'users' array already exist in auth.users
async function ensureProfileExists(user: FakeUserData): Promise<boolean> {
    try {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: user.id, email: user.email, username: user.username }, { onConflict: 'id' });
        if (error) {
            console.error(`Error upserting profile for ${user.email} (ID: ${user.id}):`, error.message);
            return false;
        }
        return true;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Exception processing profile for ${user.email}:`, message);
        return false;
    }
}

// --- Main Function ---
interface CreatedListingInfo extends Listing {
    skill: string;
    owner_id: string;
    owner_username: string;
}

async function createFakeData(): Promise<void> {
    const createdListings: CreatedListingInfo[] = [];
    let createdReviewCount = 0;
    const verifiedUserIds: string[] = []; // Track users whose profiles are confirmed
    const listingsPerCategory = 50; // Minimum listings per category

    try {
        console.log(`Starting fake data generation (target: ${listingsPerCategory} listings/category)...`);

        // 1. Ensure Profiles Exist (Requires Auth Users to exist already)
        console.log("Ensuring user profiles exist/are updated...");
        let profileSuccessCount = 0;
        for (const user of users) {
            if (await ensureProfileExists(user)) {
                 verifiedUserIds.push(user.id); // Use the ID from the user array
                 profileSuccessCount++;
            } else {
                 console.error(`Profile step FAILED for ${user.username} (ID: ${user.id}). Ensure this user exists in Supabase Auth!`);
            }
        }
        console.log(`Profile check complete (${profileSuccessCount}/${users.length} OK).`);
        if (profileSuccessCount === 0) {
             console.error("No profiles could be verified/created. Make sure Auth users exist. Aborting.");
             return;
        }

        // 2. Create Listings (Iterate through categories)
        console.log(`\nCreating listings for ${Object.keys(categorySkills).length} categories...`);
        const usersWithData = users.filter(u => verifiedUserIds.includes(u.id)); // Use only verified users

        for (const category of Object.keys(categorySkills)) {
            console.log(` -> Generating ${listingsPerCategory} listings for category: ${category}`);
            for (let i = 0; i < listingsPerCategory; i++) {
                // Assign listing to a random verified user
                const randomUser = getRandomItem(usersWithData);
                if (!randomUser) {
                    console.warn("Could not select a random user, skipping listing.");
                    continue;
                }

                const listingData = generateFakeListing(randomUser.id, randomUser.username, category);
                const listing = await createListing(listingData); // Calls original + embedding
                if (listing) {
                    // Extract a representative skill name (simplified)
                    let skill = category; // Default to category name
                    const titleMatch = listing.title.toLowerCase();
                    if (titleMatch.includes("services")) skill = titleMatch.split(" services")[0];
                    else if (titleMatch.includes("lessons")) skill = titleMatch.split(" lessons")[0];
                    else if (titleMatch.includes("consultant")) skill = titleMatch.split(" consultant")[0].replace('professional ', '');
                    else if (titleMatch.includes("expert")) skill = titleMatch.split(" expert")[0].replace('looking for ', '');

                    createdListings.push({
                        ...listing,
                        skill,
                        owner_id: randomUser.id,
                        owner_username: randomUser.username
                    });
                }
                 // Optional: Add a small delay to avoid hitting rate limits too quickly
                 // await new Promise(resolve => setTimeout(resolve, 50)); // e.g., 50ms delay
            }
             console.log(`    -> Finished category: ${category}`);
        }
        console.log(`Finished creating ${createdListings.length} total listings.`);

        // 3. Create Reviews (Only using verified users)
        console.log(`\nCreating reviews for ${createdListings.length} listings...`);
        for (const listing of createdListings) {
            const numReviews = getRandomNumber(0, 3); // Keep review count low to avoid too much data
            if (numReviews === 0) continue;

             const potentialReviewerIds = verifiedUserIds.filter(id => id !== listing.owner_id);
             if (potentialReviewerIds.length === 0) continue;

             const reviewerIds = new Set<string>();
             let attempts = 0;
             const maxReviewers = Math.min(numReviews, potentialReviewerIds.length);
             while (reviewerIds.size < maxReviewers && attempts < users.length * 2) {
                 const randomReviewerId = getRandomItem(potentialReviewerIds);
                 if(randomReviewerId) reviewerIds.add(randomReviewerId); // Check if randomReviewerId is defined
                 attempts++;
             }

            for (const reviewerId of reviewerIds) {
                 const reviewerData = users.find(u => u.id === reviewerId);
                 const reviewerUsername = reviewerData?.username || 'UnknownReviewer';
                 const reviewData = generateFakeReview(reviewerId, reviewerUsername, listing.id, listing.owner_id, listing.skill);
                 if (reviewData) {
                    const review = await createReview(reviewData); // Calls original + embedding
                    if (review) createdReviewCount++;
                 }
                 // Optional delay
                 // await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        console.log(`Finished creating ${createdReviewCount} reviews.`);
        console.log("\nFake data generation complete! Embeddings are being generated/stored in the background.");

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("FATAL Error in createFakeData:", message);
        if (error instanceof Error) console.error(error.stack);
    }
}

// --- Execute the Main Function ---
createFakeData()
  .then(() => console.log("\nScript execution finished."))
  .catch(e => console.error("\nScript ended with error:", e));
