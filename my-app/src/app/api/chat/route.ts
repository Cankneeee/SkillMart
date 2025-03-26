// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOpenAIInstance } from '@/lib/openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface ChatRequest {
  message: string;
  sessionId: string;
  sessionHistory: { text: string; sender: 'user' | 'bot' }[];
}

export async function POST(request: Request) {
  try {
    const { message, sessionId, sessionHistory } = await request.json() as ChatRequest;
    const supabase = await createClient();
    const openai = getOpenAIInstance();
    
    // Find or create session in database
    let dbSessionId = sessionId;
    
    if (sessionId.startsWith('session-')) {
      // This is a client-side generated ID, need to create in DB
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }
      
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          name: 'New Chat',
          user_id: userData.user.id
        })
        .select()
        .single();
        
      if (error) throw error;
      dbSessionId = newSession.id;
    }
    
    // Store user message in database
    await supabase
      .from('chat_messages')
      .insert({
        session_id: dbSessionId,
        sender: 'user',
        text: message
      });
    
    // Generate embedding for the user message
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // --- BEGIN ENHANCED CONTEXT GATHERING ---
    
    // 1. Find relevant listings based on query embedding
    let listingsContext = "";
    const { data: relevantListings } = await supabase.rpc(
      'match_listings',
      {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.6,
        max_results: 5
      }
    );
    
    if (relevantListings && relevantListings.length > 0) {
      const listingIds = relevantListings.map((item: any) => item.id);
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, description, price, category, listing_type, user_id')
        .in('id', listingIds);
      
      if (listings && listings.length > 0) {
        listingsContext = "Relevant listings from the database:\n\n" + 
          listings.map((l: any, i: number) => 
            `Listing ${i+1}:\n- ID: ${l.id}\n- Title: ${l.title}\n- Category: ${l.category}\n- Type: ${l.listing_type}\n- Price: $${l.price}\n- Description: ${l.description?.substring(0, 100)}...\n- URL: /listings/${l.id}`
          ).join('\n\n');
      }
    }
    
    // 2. Check for similar listings requests by looking for listing IDs
    let similarListingsContext = "";
    const extractListingIds = (text: string): string[] => {
      const idPattern = /\/listings\/([0-9a-f-]+)/g;
      const matches = [...text.matchAll(idPattern)];
      return matches.map(match => match[1]);
    };
    
    // Extract IDs from the current message and recent history
    const mentionedIds: string[] = extractListingIds(message);
    
    // Add IDs from recent messages (last 3)
    sessionHistory.slice(-3).forEach(msg => {
      const ids = extractListingIds(msg.text);
      mentionedIds.push(...ids);
    });
    
    // If we found listing IDs, fetch similar listings for the most recent one
    if (mentionedIds.length > 0) {
      const mostRecentId = mentionedIds[mentionedIds.length - 1];
      
      const { data: similarListings } = await supabase.rpc(
        'similar_listings',
        {
          listing_id: mostRecentId,
          similarity_threshold: 0.6,
          max_results: 3
        }
      );
      
      if (similarListings && similarListings.length > 0) {
        const similarIds = similarListings.map((item: any) => item.id);
        const { data: listings } = await supabase
          .from('listings')
          .select('id, title, description, price, category, listing_type')
          .in('id', similarIds);
        
        if (listings && listings.length > 0) {
          similarListingsContext = "Similar listings to what was mentioned:\n\n" + 
            listings.map((l: any, i: number) => 
              `Similar Listing ${i+1}:\n- ID: ${l.id}\n- Title: ${l.title}\n- Category: ${l.category}\n- Type: ${l.listing_type}\n- Price: $${l.price}\n- Description: ${l.description?.substring(0, 100)}...\n- URL: /listings/${l.id}`
            ).join('\n\n');
        }
      }
    }
    
    // 3. Add information about recent categories from recent conversations
    let categoryContext = "";
    const categoryPattern = /(photography|programming|design|music|writing|language|fitness|cooking|business|technology|education|lifestyle)/gi;
    const mentionedCategories = new Set<string>();
    
    // From current message
    const currentCategoryMatches = message.match(categoryPattern) || [];
    currentCategoryMatches.forEach(cat => mentionedCategories.add(cat.toLowerCase()));
    
    // From session history (last 3 messages)
    sessionHistory.slice(-3).forEach(msg => {
      const matches = msg.text.match(categoryPattern) || [];
      matches.forEach(cat => mentionedCategories.add(cat.toLowerCase()));
    });
    
    if (mentionedCategories.size > 0) {
      const categories = Array.from(mentionedCategories);
      
      // Get category information
      const categoryPromises = categories.map(async (category) => {
        const { data: categoryListings } = await supabase
          .from('listings')
          .select('id, title')
          .ilike('category', `%${category}%`)
          .limit(3);
          
        return {
          category,
          examples: categoryListings || []
        };
      });
      
      const categoryResults = await Promise.all(categoryPromises);
      
      categoryContext = "Information about mentioned categories:\n\n" +
        categoryResults.map(result => 
          `Category: ${result.category.charAt(0).toUpperCase() + result.category.slice(1)}\n` +
          `Example listings: ${result.examples.map(l => `${l.title} (/listings/${l.id})`).join(', ')}`
        ).join('\n\n');
    }
    
    // --- END ENHANCED CONTEXT GATHERING ---
    
    // Compile all context
    const contextParts = [listingsContext, similarListingsContext, categoryContext]
      .filter(context => context.length > 0);
    
    const combinedContext = contextParts.length > 0 
      ? "### CONTEXT INFORMATION ###\n\n" + contextParts.join("\n\n") + "\n\n###################\n\n"
      : "";
    
    // Create system message with instructions
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: `You are a helpful assistant for SkillMart, a marketplace where people exchange knowledge and services. 

Your task is to:
1. Answer general questions about the platform
2. Help users find listings based on their criteria
3. Recommend similar listings when appropriate
4. Provide information about different service categories

When referencing listings, include the complete URL path as /listings/{id} so users can click through.

Use the provided context information when available, but respond naturally and conversationally.

${combinedContext ? "Use this context information to inform your response, but do not explicitly mention that you're using 'context' or 'database' information. Integrate it naturally." : ""}

Be friendly, helpful, and concise. If asked about a listing and you don't have information about it, suggest searching for similar listings in that category.`
    };
    
    // Prepare conversation history
    const historyMessages: ChatCompletionMessageParam[] = sessionHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: message
    };
    
    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Using a more capable model for better understanding
      messages: [systemMessage, ...historyMessages, userMessage],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const responseText = completion.choices[0].message.content || "I'm sorry, I couldn't process your request.";
    
    // Store bot response in database
    await supabase
      .from('chat_messages')
      .insert({
        session_id: dbSessionId,
        sender: 'bot',
        text: responseText
      });
    
    return NextResponse.json({ 
      response: responseText,
      sessionId: dbSessionId
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}