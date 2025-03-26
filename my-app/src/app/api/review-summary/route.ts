// app/api/review-summary/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOpenAIInstance } from '@/lib/openai';

interface SummaryRequest {
  listingId: string;
}

export async function POST(request: Request) {
  try {
    const { listingId } = await request.json() as SummaryRequest;
    const supabase = await createClient();
    const openai = getOpenAIInstance();
    
    // Check if we already have an up-to-date summary
    const { data: existingSummary } = await supabase
      .from('listing_summaries')
      .select('summary, pros, cons, needs_update')
      .eq('listing_id', listingId)
      .single();
      
    if (existingSummary && !existingSummary.needs_update) {
      return NextResponse.json({
        summary: existingSummary.summary,
        pros: existingSummary.pros,
        cons: existingSummary.cons
      });
    }
    
    // Fetch reviews for this listing
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, comment, rating, user_id')
      .eq('listing_id', listingId);
      
    if (reviewsError) throw reviewsError;
    
    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ 
        summary: "No reviews available for this listing.",
        pros: [],
        cons: []
      });
    }
    
    // Create a query embedding
    const query = "What are the key points from these reviews?";
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Find similar reviews using vector similarity
    const { data: relevantReviewIds, error: matchError } = await supabase.rpc(
      'match_reviews',
      {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.5,
        max_results: 10,
        listing_id: listingId
      }
    );
    
    if (matchError) throw matchError;
    
    // Get the full content of the most relevant reviews
    let relevantReviews = reviews;
    if (relevantReviewIds && relevantReviewIds.length > 0) {
      relevantReviews = reviews.filter(review => 
        relevantReviewIds.some((r: { id: any; }) => r.id === review.id)
      );
    }
    
    // Extract review texts and ratings
    const reviewsContext = relevantReviews.map(review => 
      `Review rating: ${review.rating}/5\nReview content: ${review.comment || "No comment provided."}`
    ).join('\n\n');
    
    // Generate the summary using the LLM
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
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
    
    const responseJson = JSON.parse(completion.choices[0].message.content || "{}");
    const summary = responseJson.summary || "Unable to generate summary.";
    const pros = responseJson.pros || [];
    const cons = responseJson.cons || [];
    
    // Store or update the summary in the database
    await supabase
      .from('listing_summaries')
      .upsert({
        listing_id: listingId,
        summary: summary,
        pros: pros,
        cons: cons,
        needs_update: false,
        updated_at: new Date().toISOString()
      });
    
    return NextResponse.json({ summary, pros, cons });
  } catch (error) {
    console.error('Review summary error:', error);
    return NextResponse.json(
      { error: 'Failed to generate review summary' },
      { status: 500 }
    );
  }
}