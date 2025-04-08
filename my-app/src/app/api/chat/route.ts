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
  const requestStartTime = Date.now();
  let currentSessionIdForLogging = 'unknown'; // For logging scope

  try {
    const { message, sessionId, sessionHistory } = await request.json() as ChatRequest;
    currentSessionIdForLogging = sessionId; // Update for logging

    console.log(`[${requestStartTime}] --- CHAT API START ---`);
    console.log(`[${requestStartTime}] Received Request: sessionId=${sessionId}, message="${message}", historyLength=${sessionHistory.length}`);

    const supabase = await createClient();
    const openai = getOpenAIInstance();

    let dbSessionId = sessionId; // Use let as it might be reassigned

    // --- Session Handling ---
    // Treat temporary IDs AND the initial 'default-session' as triggers to create a DB session
    if (sessionId.startsWith('session-') || sessionId === 'default-session') {
      console.log(`[${requestStartTime}] Temporary sessionId detected: ${sessionId}. Attempting to create DB session.`);
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.error(`[${requestStartTime}] Authentication error during session creation:`, userError);
        throw new Error('User not authenticated for session creation');
      }
      console.log(`[${requestStartTime}] User authenticated: ${userData.user.id}`);

      try {
        console.log(`[${requestStartTime}] Inserting new session into chat_sessions for user: ${userData.user.id}`);
        const { data: newSession, error: insertSessionError } = await supabase
          .from('chat_sessions')
          .insert({
            name: `Chat started ${new Date().toLocaleTimeString()}`, // More descriptive default name
            user_id: userData.user.id
          })
          .select('id') // Only select the ID
          .single();

        if (insertSessionError) {
          console.error(`[${requestStartTime}] Error inserting new chat_sessions row:`, insertSessionError);
          throw insertSessionError; // Propagate error
        }

        if (!newSession || !newSession.id) {
           console.error(`[${requestStartTime}] Failed to create session or retrieve ID.`);
           throw new Error('Failed to create session in database.');
        }

        dbSessionId = newSession.id; // Assign the new database ID
        currentSessionIdForLogging = dbSessionId; // Update for subsequent logs
        console.log(`[${requestStartTime}] New DB session created successfully. ID: ${dbSessionId}`);

      } catch (dbError) {
        console.error(`[${requestStartTime}] Database operation failed during session creation:`, dbError);
        // Depending on requirements, you might want to return an error or continue without saving
        return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
      }

    } else {
      console.log(`[${requestStartTime}] Using existing sessionId: ${sessionId}`);
      dbSessionId = sessionId; // Ensure dbSessionId is assigned even if not creating new
    }

    // --- Store User Message ---
    try {
      console.log(`[${requestStartTime}] Inserting USER message for session: ${dbSessionId}`);
      const { error: insertUserMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: dbSessionId,
          sender: 'user',
          text: message
        });

      if (insertUserMsgError) {
        console.error(`[${requestStartTime}] Error inserting USER message:`, insertUserMsgError);
        // Decide if you want to throw or just log and continue
        // throw insertUserMsgError;
      } else {
        console.log(`[${requestStartTime}] USER message inserted successfully for session: ${dbSessionId}`);
      }
    } catch (dbError) {
       console.error(`[${requestStartTime}] Database exception during USER message insert:`, dbError);
       // Handle as needed
    }

    // --- Generate Embedding & Context (Keep Existing Logic) ---
    console.log(`[${requestStartTime}] Generating embedding for user message...`);
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`[${requestStartTime}] Embedding generated.`);

    // ... (keep your existing context gathering logic here: match_listings, similar_listings, category context) ...
    // Add logs within that logic if needed
    console.log(`[${requestStartTime}] Context gathering complete.`);
    const combinedContext = "/* Your compiled context string here */"; // Placeholder - Replace with your actual context compilation logic

    // --- Prepare AI Request ---
    const systemMessage: ChatCompletionMessageParam = {
        role: "system",
        content: `You are a helpful assistant for SkillMart, a marketplace where people exchange knowledge and services.
        Your primary goal is to answer user questions accurately based *only* on the information provided in the CONTEXT INFORMATION section below, if present, and the current conversation history.
    
        Your tasks are:
        1. Answer general questions about the platform (using your general knowledge if no context is provided).
        2. Help users find listings *if relevant listings are provided in the CONTEXT INFORMATION*.
        3. Recommend similar listings *if similar listings are provided in the CONTEXT INFORMATION*.
        4. Provide information about service categories *if category examples are provided in the CONTEXT INFORMATION*.
    
        **Crucially: Do NOT invent listing details, URLs, user activities, or any information not explicitly present in the CONTEXT INFORMATION or conversation history.**
    
        If the CONTEXT INFORMATION does not contain the answer to the user's specific query about a listing or user:
        - Explicitly state that you cannot find the specific information requested.
        - Do NOT make up details.
        - You MAY suggest a general search or Browse a relevant category if appropriate.
    
        When referencing listings *found in the context*, include the complete URL path as /listings/{id}.
    
        ${combinedContext ? `### CONTEXT INFORMATION ###\n\n${combinedContext}\n\n###################\n\nUse the context above to answer the user's request.` : "No specific database context provided for this query."}
    
        Be friendly, helpful, concise, and strictly factual based on the provided information.`
    };
    // This is the corrected mapping that resolves the TypeScript error
    const historyMessages: ChatCompletionMessageParam[] = sessionHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    const userMessage: ChatCompletionMessageParam = { role: "user", content: message };

    console.log(`[${requestStartTime}] Calling OpenAI completion API...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [systemMessage, ...historyMessages, userMessage],
      max_tokens: 500,
      temperature: 0.7,
    });
    const responseText = completion.choices[0].message.content || "I'm sorry, I couldn't process your request.";
    console.log(`[${requestStartTime}] OpenAI response received.`);

    // --- Store Bot Response ---
    try {
      console.log(`[${requestStartTime}] Inserting BOT message for session: ${dbSessionId}`);
      const { error: insertBotMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: dbSessionId,
          sender: 'bot',
          text: responseText
        });

      if (insertBotMsgError) {
        console.error(`[${requestStartTime}] Error inserting BOT message:`, insertBotMsgError);
        // Decide if you want to throw or just log and continue
        // throw insertBotMsgError;
      } else {
        console.log(`[${requestStartTime}] BOT message inserted successfully for session: ${dbSessionId}`);
      }
    } catch (dbError) {
       console.error(`[${requestStartTime}] Database exception during BOT message insert:`, dbError);
       // Handle as needed
    }

    // --- Return Response ---
    console.log(`[${requestStartTime}] Returning response. SessionId being returned: ${dbSessionId}`);
    console.log(`[${requestStartTime}] --- CHAT API END --- Total Time: ${Date.now() - requestStartTime}ms`);

    return NextResponse.json({
      response: responseText,
      sessionId: dbSessionId // Return the correct session ID (potentially the new DB one)
    });

  } catch (error) {
    const errorTime = Date.now();
    console.error(`[${errorTime}] --- CHAT API ERROR --- SessionId at error: ${currentSessionIdForLogging}. Total Time: ${errorTime - requestStartTime}ms`, error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}