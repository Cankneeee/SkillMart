import { resolve } from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient, PostgrestError, AuthError } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { EmbeddingCreateParams } from 'openai/resources/embeddings';
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

const listingTemplates = [
  { title: "{skill} Services by {username}", description: "Experienced {skill} professional offering high-quality services. I have {years} years of experience and specialize in {specialty}. My approach focuses on {approach}, ensuring you get the best results. Contact me for a free consultation!", listing_type: "Providing Skills", categories: ["Business", "IT & Software", "Design", "Marketing", "Finance & Accounting"] },
  { title: "Looking for {skill} Expert", description: "I need help with {problem}. Seeking someone experienced in {skill} who can assist with this project. My budget is flexible for the right expertise. Ideal candidate will have knowledge of {tools} and experience with {specialty}.", listing_type: "Looking for Skills", categories: ["Office Productivity", "Personal Development", "IT & Software", "Teaching & Academics"] },
  { title: "Trading {skill1} for {skill2}", description: "I'm offering my expertise in {skill1} in exchange for help with {skill2}. I can provide {offering} and would like to receive {receiving} in return. This is a great opportunity for skills exchange and mutual growth.", listing_type: "Trading Skills", categories: ["Photography & Video", "Music", "Lifestyle", "Art", "Sports"] },
  { title: "Affordable {skill} Lessons", description: "Learn {skill} from an experienced instructor. I offer personalized lessons for all levels, from beginner to advanced. My teaching method emphasizes {approach}, and I provide {materials}. Sessions available online or in-person.", listing_type: "Providing Skills", categories: ["Music", "Teaching & Academics", "Health & Fitness", "Personal Development"] },
  { title: "Professional {skill} Consultant", description: "Strategic {skill} consulting to help you achieve your goals. I provide comprehensive analysis, actionable recommendations, and implementation support. My expertise includes {specialty1}, {specialty2}, and {specialty3}. Proven track record of success.", listing_type: "Providing Skills", categories: ["Business", "Finance & Accounting", "Marketing", "IT & Software"] }
] as Array<{ title: string; description: string; listing_type: FakeListingData['listing_type']; categories: string[]; }>;

const categorySkills: Record<string, string[]> = {
  "Business": ["Business Strategy", "Project Management", "Entrepreneurship", "Operational Efficiency", "Team Leadership"],
  "Finance & Accounting": ["Financial Analysis", "Bookkeeping", "Tax Planning", "Investment Strategy", "Financial Modeling"],
  "IT & Software": ["Web Development", "Mobile App Development", "Software Engineering", "Cloud Architecture", "DevOps"],
  "Office Productivity": ["Microsoft Office", "Google Workspace", "Data Analysis", "Process Optimization", "Automation"],
  "Personal Development": ["Life Coaching", "Time Management", "Public Speaking", "Mindfulness", "Goal Setting"],
  "Design": ["Graphic Design", "UI/UX Design", "Brand Identity", "Illustration", "Motion Graphics"],
  "Art": ["Painting", "Drawing", "Sculpture", "Digital Art", "Mixed Media"],
  "Marketing": ["Digital Marketing", "Content Strategy", "Social Media Management", "SEO", "Email Marketing"],
  "Lifestyle": ["Interior Design", "Culinary Arts", "Event Planning", "Fashion Styling", "Sustainable Living"],
  "Photography & Video": ["Portrait Photography", "Videography", "Photo Editing", "Cinematography", "Drone Photography"],
  "Health & Fitness": ["Personal Training", "Nutrition Planning", "Yoga Instruction", "Fitness Assessment", "Wellness Coaching"],
  "Music": ["Music Production", "Instrument Lessons", "Vocal Coaching", "Songwriting", "Audio Engineering"],
  "Sports": ["Sports Coaching", "Performance Training", "Technique Analysis", "Athletic Development", "Game Strategy"],
  "Teaching & Academics": ["Tutoring", "Curriculum Development", "Research Assistance", "Language Teaching", "Test Preparation"]
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
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return result;
}


// --- Data Generation Functions (With "Empty Array" Fix) ---
function generateFakeListing(userId: string, username: string): FakeListingData {
    const template = getRandomItem(listingTemplates);
    const categoriesForTemplate = template.categories?.length > 0 ? template.categories : ['Business'];
    const category = getRandomItem(categoriesForTemplate, 'Business');
    const categorySkillList = categorySkills[category];
    const skills = (categorySkillList && categorySkillList.length > 0) ? categorySkillList : ['general services'];

    // Safely generate skill2
    const randomCategoryKey = getRandomItem(Object.keys(categorySkills));
    let skill2List = categorySkills[randomCategoryKey] ?? [];
    if (skill2List.length === 0) skill2List = ['general skill'];
    const skill2 = getRandomItem(skill2List);

    const replacements: Record<string, string | number> = {
        username,
        skill: getRandomItem(skills, 'default skill'),
        skill1: getRandomItem(skills, 'related skill'),
        skill2: skill2,
        years: getRandomNumber(1, 15),
        specialty: getRandomItem(skills, 'core specialty'),
        specialty1: getRandomItem(skills, 'spec 1'),
        specialty2: getRandomItem(skills, 'spec 2'),
        specialty3: getRandomItem(skills, 'spec 3'),
        approach: getRandomItem(["practical", "theoretical", "hands-on"], "practical"),
        tools: getRandomItem(["standard software", "latest tech", "custom tools"], "standard software"),
        problem: getRandomItem(["complex projects", "specific issues", "strategic goals"], "specific issues"),
        offering: getRandomItem(["consultations", "tutorials", "solutions", "guidance"], "consultations"),
        receiving: getRandomItem(["assistance", "creative input", "advice", "expertise"], "assistance"),
        materials: getRandomItem(["resources", "exercises", "feedback", "examples"], "resources")
    };
    const price: number | undefined = template.listing_type !== "Trading Skills" ? getRandomPrice() : undefined;
    return {
        title: fillTemplate(template.title, replacements),
        description: fillTemplate(template.description, replacements),
        listing_type: template.listing_type,
        category,
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

    try {
        console.log("Starting fake data generation (with embeddings)...");

        // 1. Ensure Profiles Exist (Requires Auth Users to exist already)
        console.log("Ensuring user profiles exist/are updated...");
        let profileSuccessCount = 0;
        for (const user of users) {
            if (await ensureProfileExists(user)) {
                 verifiedUserIds.push(user.id); // Use the ID from the user array
                 profileSuccessCount++;
                 // console.log(`Profile OK for ${user.username} (${user.id})`); // Less verbose
            } else {
                 console.error(`Profile step FAILED for ${user.username} (ID: ${user.id}). Ensure this user exists in Supabase Auth!`);
            }
        }
        console.log(`Profile check complete (${profileSuccessCount}/${users.length} OK).`);
        if (profileSuccessCount === 0) {
             console.error("No profiles could be verified/created. Make sure Auth users exist. Aborting.");
             return;
        }

        // 2. Create Listings (Only for users whose profiles were verified)
        console.log(`\nCreating listings for ${profileSuccessCount} users...`);
        const usersToProcess = users.filter(u => verifiedUserIds.includes(u.id));

        for (const user of usersToProcess) {
            const numListings = getRandomNumber(2, 4);
            // console.log(`Creating ${numListings} listings for user: ${user.username} (${user.id})`); // Less verbose
            for (let i = 0; i < numListings; i++) {
                const listingData = generateFakeListing(user.id, user.username);
                const listing = await createListing(listingData); // Calls original + embedding
                if (listing) {
                    let skill = listing.category || "service";
                    const titleMatch = listing.title.toLowerCase(); if (titleMatch.includes("services")) skill = titleMatch.split(" services")[0]; else if (titleMatch.includes("lessons")) skill = titleMatch.split(" lessons")[0]; else if (titleMatch.includes("consultant")) skill = titleMatch.split(" consultant")[0].replace('professional ', ''); else if (titleMatch.includes("expert")) skill = titleMatch.split(" expert")[0].replace('looking for ', '');
                    createdListings.push({ ...listing, skill, owner_id: user.id, owner_username: user.username });
                    // console.log(` -> Created listing: ${listing.title.substring(0, 50)}...`); // Less verbose
                }
            }
        }
        console.log(`Finished creating ${createdListings.length} listings.`);

        // 3. Create Reviews (Only using verified users)
        console.log(`\nCreating reviews for ${createdListings.length} listings...`);
        for (const listing of createdListings) {
            const numReviews = getRandomNumber(0, 3);
            if (numReviews === 0) continue;

             const potentialReviewerIds = verifiedUserIds.filter(id => id !== listing.owner_id);
             if (potentialReviewerIds.length === 0) continue;

             const reviewerIds = new Set<string>();
             let attempts = 0;
             const maxReviewers = Math.min(numReviews, potentialReviewerIds.length);
             while (reviewerIds.size < maxReviewers && attempts < users.length * 2) {
                 const randomReviewerId = getRandomItem(potentialReviewerIds); reviewerIds.add(randomReviewerId); attempts++;
             }

            for (const reviewerId of reviewerIds) {
                 const reviewerData = users.find(u => u.id === reviewerId);
                 const reviewerUsername = reviewerData?.username || 'UnknownReviewer';
                 const reviewData = generateFakeReview(reviewerId, reviewerUsername, listing.id, listing.owner_id, listing.skill);
                 if (reviewData) {
                    const review = await createReview(reviewData); // Calls original + embedding
                    if (review) createdReviewCount++;
                 }
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