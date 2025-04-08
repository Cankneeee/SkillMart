import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOpenAIInstance } from '@/lib/openai';

interface EmbeddingRequest {
  type: 'review' | 'listing';
  id: string;
  text: string;
}

export async function POST(request: Request) {
  const requestStartTime = Date.now();
  let itemType: string | null = null; // For logging scope
  let itemId: string | null = null; // For logging scope

  try {
    const requestBody = await request.json();
    // Assign early for logging in case of parsing errors below
    itemType = requestBody.type;
    itemId = requestBody.id;
    console.log(`[${requestStartTime}] Embedding API endpoint called for type: ${itemType}, ID: ${itemId}`);

    const { type, id, text } = requestBody as EmbeddingRequest;

    if (!type || !id || !text) {
      console.error(`[${requestStartTime}] Missing required fields for ID: ${id}:`, { type, id, textLength: text?.length });
      return NextResponse.json(
        { error: 'Missing required fields: type, id, or text' },
        { status: 400 }
      );
    }
     // Re-assign validated values
    itemType = type;
    itemId = id;

    console.log(`[${requestStartTime}] Processing embedding request for ${type} ID: ${id}. Text length: ${text.length} characters`);

    // --- Initialize Clients ---
    let supabase;
    try {
      console.log(`[${requestStartTime}] Initializing Supabase client for ID: ${id}`);
      supabase = await createClient();
      console.log(`[${requestStartTime}] Supabase client initialized successfully for ID: ${id}`);
    } catch (supabaseInitError) {
      console.error(`[${requestStartTime}] Failed to initialize Supabase client for ID: ${id}:`, supabaseInitError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    let openai;
    try {
      console.log(`[${requestStartTime}] Initializing OpenAI client for ID: ${id}`);
      openai = getOpenAIInstance();
      console.log(`[${requestStartTime}] OpenAI client initialized successfully for ID: ${id}`);
    } catch (openaiInitError) {
      console.error(`[${requestStartTime}] Failed to initialize OpenAI client for ID: ${id}:`, openaiInitError);
      return NextResponse.json({ error: 'AI service initialization failed' }, { status: 500 });
    }

    // --- Generate Embedding ---
    let embedding;
    try {
      const embeddingStartTime = Date.now();
      console.log(`[${requestStartTime}] Calling OpenAI API to generate embedding for ${type} ID: ${id}`);
      const response = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
      embedding = response.data[0].embedding;
      console.log(`[${requestStartTime}] Successfully generated embedding for ${type} ID: ${id}. Dimensions: ${embedding.length}. Time: ${Date.now() - embeddingStartTime}ms`);
    } catch (embeddingError) {
      console.error(`[${requestStartTime}] OpenAI embedding generation failed for ${type} ID: ${id}:`, embeddingError);
      return NextResponse.json(
        { error: 'Embedding generation failed', details: (embeddingError as Error).message },
        { status: 500 }
      );
    }

    // --- Store Embedding ---
    try {
      const storeStartTime = Date.now();
      const tableName = type === 'review' ? 'review_embeddings' : 'listing_embeddings';
      console.log(`[${requestStartTime}] Storing ${type} embedding for ID: ${id} using store_embedding function`);

      // Using RPC call as in the original code
      const { error: storeEmbedError } = await supabase.rpc('store_embedding', {
        p_table_name: tableName,
        p_id: id,
        p_embedding: embedding as any // Cast as needed if vector type mismatches
      });

      if (storeEmbedError) {
        console.error(`[${requestStartTime}] Error storing ${type} embedding for ID: ${id} via RPC:`, storeEmbedError);
        throw storeEmbedError; // Throw to prevent summary update attempt if storing failed
      }
      console.log(`[${requestStartTime}] ${type} embedding stored successfully for ID: ${id}. Time: ${Date.now() - storeStartTime}ms`);

    } catch (storageError) {
      console.error(`[${requestStartTime}] Error during embedding storage process for ${type} ID: ${id}:`, storageError);
      // Return error response if storing embedding fails
      return NextResponse.json(
        { error: 'Failed to store embedding', details: (storageError as Error).message },
        { status: 500 }
      );
    }

    // --- Update Listing Summary (ONLY for reviews) ---
    // This block is crucial as it's now the primary way to trigger summary updates via code
    if (type === 'review') {
       let listingIdForSummary: string | null = null;
       try {
            console.log(`[${requestStartTime}] Fetching listing_id for review ID: ${id}`);
            const { data: reviewData, error: reviewFetchError } = await supabase
              .from('reviews')
              .select('listing_id')
              .eq('id', id)
              .single(); // Use single to expect one row or null/error

            if (reviewFetchError && reviewFetchError.code !== 'PGRST116') { // Ignore "No rows found"
              console.error(`[${requestStartTime}] Error fetching review data for review ID ${id}:`, reviewFetchError);
              // Log and continue - summary won't be marked for update
            } else if (reviewData?.listing_id) {
              listingIdForSummary = reviewData.listing_id;
              console.log(`[${requestStartTime}] Found listing_id ${listingIdForSummary} for review ID ${id}.`);

              // *** ADDED: Specific try-catch for summary update ***
              try {
                console.log(`[${requestStartTime}] Attempting to mark listing summary for update via upsert, listing_id: ${listingIdForSummary}`);
                const summaryUpdateStartTime = Date.now();
                const { error: summaryUpdateError } = await supabase
                  .from('listing_summaries')
                  .upsert({ // Use upsert for robustness
                    listing_id: listingIdForSummary,
                    needs_update: true,
                    updated_at: new Date().toISOString(),
                    // Provide default values for required fields if inserting
                    summary: '', // Or fetch existing summary if needed
                    pros: [],
                    cons: []
                  }, {
                    onConflict: 'listing_id' // Specify conflict column
                  })
                  .select('listing_id') // Select something minimal
                  .single(); // Expect one row affected

                if (summaryUpdateError) {
                  console.error(`[${requestStartTime}] Error UPSERTING listing summary for listing_id ${listingIdForSummary}:`, summaryUpdateError);
                  // Log error, but allow embedding process to succeed
                } else {
                  console.log(`[${requestStartTime}] Listing summary marked for update successfully for listing_id: ${listingIdForSummary}. Time: ${Date.now() - summaryUpdateStartTime}ms`);
                }
              } catch (innerSummaryError) {
                  // Catch errors specifically during the summary upsert operation
                   console.error(`[${requestStartTime}] Exception during summary upsert operation for listing_id ${listingIdForSummary}:`, innerSummaryError);
              }
            } else {
              console.warn(`[${requestStartTime}] No listing_id found for review ID ${id}. Cannot mark summary for update.`);
            }
       } catch (summaryUpdateProcessError) {
           // Catch errors related to fetching listing_id or the overall summary update block
           console.error(`[${requestStartTime}] Error during summary update process for review ID ${id}:`, summaryUpdateProcessError);
       }
    } // End if (type === 'review')

    // --- Final Success ---
    console.log(`[${requestStartTime}] Embedding process completed successfully for ${type} ID: ${id}. Total time: ${Date.now() - requestStartTime}ms`);
    return NextResponse.json({ success: true });

  } catch (error) {
    // Catch any unhandled errors from the main try block
    console.error(`[${requestStartTime}] Unhandled error in embedding generation API for type: ${itemType ?? 'Unknown'}, ID: ${itemId ?? 'Unknown'}:`, error);
    return NextResponse.json(
      { error: 'Failed to generate embedding', details: (error as Error).message },
      { status: 500 }
    );
  }
}