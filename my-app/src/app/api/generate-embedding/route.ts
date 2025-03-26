// app/api/generate-embedding/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOpenAIInstance } from '@/lib/openai';

interface EmbeddingRequest {
  // Type of content being embedded
  type: 'review' | 'listing';
  // ID of the content
  id: string;
  // Text to be embedded
  text: string;
}

export async function POST(request: Request) {
  try {
    const { type, id, text } = await request.json() as EmbeddingRequest;
    const supabase = await createClient();
    const openai = getOpenAIInstance();
    
    // Generate embedding using OpenAI
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    });
    
    const embedding = response.data[0].embedding;
    
    // Store in the appropriate table based on type
    if (type === 'review') {
      // Check if embedding already exists
      const { data: existingEmbedding } = await supabase
        .from('review_embeddings')
        .select('id')
        .eq('id', id)
        .single();
        
      if (existingEmbedding) {
        // Update existing embedding
        const { error } = await supabase
          .from('review_embeddings')
          .update({
            embedding: embedding,
            created_at: new Date().toISOString()
          })
          .eq('id', id);
          
        if (error) throw error;
      } else {
        // Create new embedding
        const { error } = await supabase
          .from('review_embeddings')
          .insert({
            id: id,
            embedding: embedding
          });
          
        if (error) throw error;
      }
      
      // Mark the listing summary as needing an update
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('listing_id')
        .eq('id', id)
        .single();
        
      if (reviewData?.listing_id) {
        await supabase
          .from('listing_summaries')
          .upsert({
            listing_id: reviewData.listing_id,
            needs_update: true,
            updated_at: new Date().toISOString()
          });
      }
    } else if (type === 'listing') {
      // Check if embedding already exists
      const { data: existingEmbedding } = await supabase
        .from('listing_embeddings')
        .select('id')
        .eq('id', id)
        .single();
        
      if (existingEmbedding) {
        // Update existing embedding
        const { error } = await supabase
          .from('listing_embeddings')
          .update({
            embedding: embedding,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
          
        if (error) throw error;
      } else {
        // Create new embedding
        const { error } = await supabase
          .from('listing_embeddings')
          .insert({
            id: id,
            embedding: embedding
          });
          
        if (error) throw error;
      }
    } else {
      throw new Error(`Unsupported embedding type: ${type}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}