import { z } from 'zod';  
import 'dotenv/config';

const EnvSchema = z.object({  
  PORT:                    z.string().default('3001'),  
  ANTHROPIC_API_KEY:       z.string().min(1, 'Anthropic API key required'),  
  CLAUDE_PRIMARY_MODEL:    z.string().default('claude-haiku-4-5-20251001'),  
  CLAUDE_ESCALATION_MODEL: z.string().default('claude-sonnet-4-6'),  
  GROQ_API_KEY:            z.string().optional(),  
  SUPABASE_URL:            z.string().url(),  
  SUPABASE_SERVICE_KEY:    z.string().min(1),  
  JWT_SECRET:              z.string().min(32),  
  NODE_ENV:                z.enum(['development', 'staging', 'production'])  
                            .default('development'),  
});

export const env = EnvSchema.parse(process.env);
