import { transcribeAudio }  from '../services/stt/googleStt.js';  
import { synthesise }       from '../services/tts/googleTts.js';  
import { routeToAI }        from '../services/ai/router.js';  
import { normalizeDialect } from '../services/ai/normalizer.js';  
import { uploadAudio, logQuery } from '../utils/storage.js';  
import { requireAuth }      from '../middleware/auth.js';  
import crypto from 'crypto';

export default async function voiceRoutes(app: any) {  
  app.post('/voice', {  
    preHandler: [requireAuth],  
  }, async (req: any, reply: any) => {  
    const startTime = Date.now();

    // 1. Extract audio  
    const parts = req.parts();  
    let audioBuffer: Buffer | null = null;  
    let langHint: string | null = null;  
    for await (const part of parts) {  
      if (part.type === 'file' && part.fieldname === 'audio') {  
        const chunks: Buffer[] = [];  
        for await (const chunk of part.file) chunks.push(chunk);  
        audioBuffer = Buffer.concat(chunks);  
      }  
      if (part.type === 'field' && part.fieldname === 'client_lang_hint') {  
        langHint = part.value as string;  
      }  
    }

    if (!audioBuffer || audioBuffer.length < 100) {  
      return reply.status(400).send({  
        error_code: 'AUDIO_TOO_SHORT',  
        user_message: 'Awaaz nahi aayi. Dobara bolen.',  
      });  
    }

    // 2. STT  
    const { transcript: rawTranscript, language } = await transcribeAudio(audioBuffer, langHint ?? undefined);  
    if (!rawTranscript) {  
      return reply.status(422).send({  
        error_code: 'STT_FAILED',  
        user_message: 'Saaf nahi suna, dobara bolen.',  
      });  
    }

    // 2b. DIALECT NORMALIZATION — Hinglish/slang → clean standard text  
    const transcript = await normalizeDialect(rawTranscript);

    // 3. AI intent parsing (receives clean text now)  
    const aiReply = await routeToAI(transcript);

    // 4. TTS — returns null when using browser speechSynthesis (free mode)
    const audioOut = await synthesise(aiReply.reply, aiReply.language);

    // 5. Upload only if server generated audio (Google TTS path)
    //    If null, frontend will use window.speechSynthesis (free, built-in)
    let replyAudioUrl: string | null = null;
    if (audioOut !== null) {
      const filename = `tts/${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
      replyAudioUrl = await uploadAudio(audioOut, filename);
    }

    // 6. Log (include raw + normalized for debugging)  
    const latencyMs = Date.now() - startTime;  
    await logQuery({  
      deviceIdHash: crypto.createHash('sha256').update(req.deviceId).digest('hex'),  
      intent: aiReply.intent,  
      language: aiReply.language,  
      latencyMs,  
    });

    const action = aiReply.action_url ? {  
      type: 'call',  
      label: 'Helpline call karein',  
      url: aiReply.action_url,  
    } : null;

    return reply.send({  
      request_id:      `req_${Date.now()}`,  
      transcript:      rawTranscript,     // original (for debugging)  
      normalized:      transcript,        // cleaned version (for debugging)  
      language:        aiReply.language,  
      reply_text:      aiReply.reply,
      // null when using browser speechSynthesis (frontend checks and uses speakText())
      reply_audio_url: replyAudioUrl,
      tts_mode:        replyAudioUrl ? 'server' : 'browser', // hint for client
      intent:          aiReply.intent,  
      icon:            aiReply.icon,  
      action,  
      latency_ms:      latencyMs,  
    });  
  });  
}
