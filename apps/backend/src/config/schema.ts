import { z } from 'zod';

// Claude voice response — matches Model_&_API.md §2.6 exactly  
export const ClaudeReplySchema = z.object({  
  reply:      z.string().min(1).max(200),  
  intent:     z.enum(['ration', 'hospital', 'bank', 'transport',  
                      'pension', 'document', 'scheme_eligibility', 'unknown']),  
  icon:       z.enum(['hospital', 'ration', 'bank', 'transport',  
                      'pension', 'document', 'phone', 'unknown']),  
  language:   z.enum(['hi', 'kn', 'ta', 'te', 'bn', 'mr', 'en']),  
  action_url: z.string().nullable(),  
  confidence: z.number().min(0).max(1),  
});

export type ClaudeReply = z.infer<typeof ClaudeReplySchema>;

// Image analysis response  
export const ImageReplySchema = z.object({  
  document_type:  z.enum(['ration_card', 'hospital_record', 'pension_letter',  
                           'bank_statement', 'id_card', 'other']),  
  extracted_text: z.string(),  
  translated_text: z.string(),  
  overview:       z.string().min(1).max(300),  
  language:       z.string(),  
  confidence:     z.number().min(0).max(1),  
});

export type ImageReply = z.infer<typeof ImageReplySchema>;
