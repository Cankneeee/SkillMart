// lib/embeddingService.ts
import { createClient } from "@/utils/supabase/client";
import { getOpenAIInstance } from "./openai";

interface EmbeddingResult {
  success: boolean;
  error?: string;
}

export async function generateAndStoreEmbedding(
  reviewId: string, 
  reviewText: string
): Promise<EmbeddingResult> {
  try {
    const supabase = createClient();
    const openai = getOpenAIInstance();
    
    // Check if embedding already exists
    const { data: existingEmbedding } = await supabase
      .from('review_embeddings')
      .select('id')
      .eq('id', reviewId)
      .single();
      
    if (existingEmbedding) {
      console.log('Embedding already exists for review:', reviewId);
      return { success: true };
    }
    
    // Generate embedding
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: reviewText
    });
    
    const embedding = response.data[0].embedding;
    
    // Store embedding
    const { error } = await supabase
      .from('review_embeddings')
      .insert({
        id: reviewId,
        embedding: embedding
      });
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error generating/storing embedding:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}