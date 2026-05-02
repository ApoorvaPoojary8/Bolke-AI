import Fastify from 'fastify';  
import { env } from './config/env.js';

const app = Fastify({  
  logger: {  
    transport: env.NODE_ENV === 'development'  
      ? { target: 'pino-pretty' }  
      : undefined,  
  },  
});

// Security  
await app.register(import('@fastify/helmet'));

// CORS — allow web client  
await app.register(import('@fastify/cors'), {  
  origin: env.NODE_ENV === 'development'  
    ? true  
    : [  
        'https://bolke.app',  
        'https://www.bolke.app',  
      ],  
});

// Rate limit per device — 60 req/hour  
await app.register(import('@fastify/rate-limit'), {  
  max: 60,  
  timeWindow: '1 hour',  
  keyGenerator: (req: any) =>  
    (req.headers['x-device-id'] as string) ?? req.ip,  
});

// Multipart for audio and image uploads  
// 5MB max for image uploads, 200KB for audio  
await app.register(import('@fastify/multipart'), {  
  limits: { fileSize: 5 * 1024 * 1024 },  
});

// Routes  
await app.register(import('./routes/health.js'),  { prefix: '/v1' });  
await app.register(import('./routes/auth.js'),    { prefix: '/v1' });  
await app.register(import('./routes/voice.js'),   { prefix: '/v1' });  
await app.register(import('./routes/image.js'),   { prefix: '/v1' });
await app.register(import('./routes/action.js'),  { prefix: '/v1' });
await app.register(import('./routes/chat.js'),    { prefix: '/v1' });
await app.register(import('./routes/tts.js'),     { prefix: '/v1' });
await app.register(import('./routes/livekit.js'), { prefix: '/v1' });

// Start  
const address = await app.listen({  
  port: Number(env.PORT),  
  host: '0.0.0.0',  
});  
console.log(`BolKe backend running at ${address}`);
