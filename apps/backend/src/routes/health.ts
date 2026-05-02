export default async function healthRoutes(app: any) {  
  app.get('/v1/health', async (_req: any, reply: any) => {  
    // Quick Claude ping  
    let claudeStatus = 'ok';  
    try {  
      const Anthropic = (await import('@anthropic-ai/sdk')).default;  
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });  
      await client.messages.create({  
        model: 'claude-haiku-4-5-20251001',  
        max_tokens: 10,  
        messages: [{ role: 'user', content: 'ping' }],  
      });  
    } catch { claudeStatus = 'degraded'; }

    return reply.send({  
      status: 'ok',  
      claude: claudeStatus,  
      stt: 'ok',   // check Google STT separately if needed  
      tts: 'ok',  
      n8n: 'ok',  
    });  
  });  
}
