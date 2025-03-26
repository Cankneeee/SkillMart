// lib/openai.ts
import { OpenAI } from 'openai';

let openaiInstance: OpenAI | null = null;

export function getOpenAIInstance(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }
    
    openaiInstance = new OpenAI({
      apiKey: apiKey,
    });
  }
  
  return openaiInstance;
}