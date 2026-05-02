// Used ONLY when Claude is completely unavailable (outage)  
import Groq from 'groq-sdk';  
import { env } from '../../config/env.js';  
import { BOLKE_SYSTEM_PROMPT } from '../../config/prompts.js';

let groqClient: Groq | null = null;

function getGroq(): Groq {  
  if (!groqClient) {  
    if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');  
    groqClient = new Groq({ apiKey: env.GROQ_API_KEY });  
  }  
  return groqClient;  
}

export async function callGroqFallback(transcript: string): Promise<string> {  
  const completion = await getGroq().chat.completions.create({  
    model: 'llama-3.3-70b-versatile',  
    messages: [  
      { role: 'system', content: BOLKE_SYSTEM_PROMPT },  
      { role: 'user',   content: transcript },  
    ],  
    max_tokens: 300,  
    temperature: 0.1,  
  });  
  return completion.choices[0]?.message?.content ?? '';  
}
