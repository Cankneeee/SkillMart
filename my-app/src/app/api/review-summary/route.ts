import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOpenAIInstance } from '@/lib/openai';

interface SummaryRequest {
  listingId: string;
}

export async function POST(request: Request) {
  const requestStartTime = Date.now();
  let listingId: string | null = null; // Define listingId here to use in logs

  try {
    const requestBody = await request.json() as SummaryRequest;
    listingId = requestBody.listingId; // Assign listingId
    console.log(`[${requestStartTime}] Review Summary API called for listingId: ${listingId}`);

    if (!listingId) {
      console.error(`[${requestStartTime}] Missing listingId in request body.`);
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 });
    }

    const supabase = await createClient();
    const openai = getOpenAIInstance();

    // Check if we already have an up-to-date summary
    console.log(`[${requestStartTime}] Checking existing summary for listingId: ${listingId}`);
    const { data: existingSummary, error: fetchSummaryError } = await supabase
      .from('listing_summaries')
      .select('summary, pros, cons, needs_update, updated_at')
      .eq('listing_id', listingId)
      .single(); // Use single() to get one row or null/error

    // Log fetch result, ignoring "No rows found" error specifically
    if (fetchSummaryError && fetchSummaryError.code !== 'PGRST116') {
       console.error(`[${requestStartTime}] Error fetching existing summary for listingId: ${listingId}:`, fetchSummaryError);
       // Consider if this should be a fatal error or if generation should proceed
       throw fetchSummaryError; // Re-throwing might be safer
    } else if (fetchSummaryError?.code === 'PGRST116') {
        console.log(`[${requestStartTime}] No existing summary row found for listingId: ${listingId}. Proceeding to generate.`);
    } else if (existingSummary) {
        console.log(`[${requestStartTime}] Found existing summary for listingId: ${listingId}. needs_update: ${existingSummary.needs_update}, updated_at: ${existingSummary.updated_at}`);
    }

    // Return cached summary if it exists and doesn't need update
    if (existingSummary && !existingSummary.needs_update) {
      console.log(`[${requestStartTime}] Returning cached summary for listingId: ${listingId}`);
      return NextResponse.json({
        summary: existingSummary.summary,
        pros: existingSummary.pros || [], // Ensure arrays even if null
        cons: existingSummary.cons || []  // Ensure arrays even if null
      });
    }

    console.log(`[${requestStartTime}] No up-to-date summary found (needs_update=${existingSummary?.needs_update ?? 'N/A'}). Generating new summary for listingId: ${listingId}.`);

    // Fetch reviews for this listing
    console.log(`[${requestStartTime}] Fetching reviews for listingId: ${listingId}`);
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, comment, rating, user_id') // Select necessary fields
      .eq('listing_id', listingId);

    if (reviewsError) {
       console.error(`[${requestStartTime}] Error fetching reviews for listingId: ${listingId}:`, reviewsError);
       throw reviewsError;
    }

    // Handle case where there are no reviews
    if (!reviews || reviews.length === 0) {
      console.log(`[${requestStartTime}] No reviews found for listingId: ${listingId}. Storing and returning empty summary.`);
      // Store an empty summary to prevent repeated generation attempts
       await supabase
         .from('listing_summaries')
         .upsert({ // Use upsert to handle potential existing row marked for update
           listing_id: listingId,
           summary: "No reviews available for this listing yet.",
           pros: [],
           cons: [],
           needs_update: false, // Mark as updated
           updated_at: new Date().toISOString()
         }, { onConflict: 'listing_id' }); // Specify conflict column

      return NextResponse.json({
        summary: "No reviews available for this listing yet.",
        pros: [],
        cons: []
      });
    }

    console.log(`[${requestStartTime}] Found ${reviews.length} reviews for listingId: ${listingId}. Proceeding with summary generation.`);

    // Prepare context for AI
     const reviewsContext = reviews.map(review =>
       `Review rating: ${review.rating}/5\nReview content: ${review.comment || "No comment provided."}`
     ).join('\n\n');

    // Generate the summary using the LLM
    console.log(`[${requestStartTime}] Calling OpenAI to generate summary for listingId: ${listingId}`);
    const completionStartTime = Date.now();
    let completion;
    try {
        completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // Or your preferred model
            messages: [
                {
                role: "system",
                content: "You are an AI assistant that summarizes product reviews. Extract common themes, highlight pros and cons, and provide a balanced overview. Return your response in JSON format with three fields: 'summary' (a brief overall summary), 'pros' (an array of positive points), and 'cons' (an array of negative points)."
                },
                {
                role: "user",
                content: `Please summarize these reviews for a listing on SkillMart:\n\n${reviewsContext}`
                }
            ],
            temperature: 0.7,
            max_tokens: 500,
            response_format: { type: "json_object" }
        });
        console.log(`[${requestStartTime}] OpenAI summary generation completed for listingId: ${listingId}. Time: ${Date.now() - completionStartTime}ms`);
    } catch (openaiError) {
        console.error(`[${requestStartTime}] OpenAI API call failed for listingId: ${listingId}:`, openaiError);
        throw openaiError; // Rethrow to be caught by the main try-catch
    }


    // Parse the response
    let summary = "Unable to generate summary.";
    let pros: string[] = [];
    let cons: string[] = [];
    try {
        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
             console.error(`[${requestStartTime}] OpenAI response content was null or empty for listingId: ${listingId}`);
             throw new Error("OpenAI response content was null or empty");
        }
        const responseJson = JSON.parse(responseContent);
        summary = responseJson.summary || summary;
        pros = responseJson.pros || pros;
        cons = responseJson.cons || cons;
         console.log(`[${requestStartTime}] Successfully parsed OpenAI summary for listingId: ${listingId}`);
    } catch (parseError) {
         console.error(`[${requestStartTime}] Failed to parse OpenAI JSON response for listingId: ${listingId}:`, parseError);
         console.error(`[${requestStartTime}] Raw OpenAI response content:`, completion.choices[0]?.message?.content);
         // Use default summary text on parse error, but log it happened
    }

    // Store or update the summary in the database using RPC
    console.log(`[${requestStartTime}] Calling RPC upsert_listing_summary for listingId: ${listingId}`);
    const rpcStartTime = Date.now();
    const { error: rpcError } = await supabase.rpc(
        'upsert_listing_summary', // Name of the SQL function
        {
            // Arguments for the function, matching the parameter names
            p_listing_id: listingId,
            p_summary: summary,
            p_pros: pros,
            p_cons: cons
        }
    );

    if (rpcError) {
      // Use the specific error variable name 'rpcError'
      console.error(`[${requestStartTime}] Error calling RPC upsert_listing_summary for listingId: ${listingId}:`, rpcError);
      // Log error, but still return the generated summary
    } else {
        // Use the specific start time variable name 'rpcStartTime'
        console.log(`[${requestStartTime}] Successfully called RPC upsert_listing_summary for listingId: ${listingId}. Time: ${Date.now() - rpcStartTime}ms`);
    }

    // Return the newly generated summary
    console.log(`[${requestStartTime}] Review Summary API finished successfully for listingId: ${listingId}. Total time: ${Date.now() - requestStartTime}ms`);
    return NextResponse.json({ summary, pros, cons });

  } catch (error) {
    // Catch any unhandled errors from the main try block
    console.error(`[${requestStartTime}] Unhandled error in Review Summary API for listingId: ${listingId ?? 'Unknown'}:`, error);
    return NextResponse.json(
      { error: 'Failed to generate review summary', details: (error as Error).message },
      { status: 500 }
    );
  }
}