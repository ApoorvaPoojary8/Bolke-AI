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

// Global Error Handler
app.setErrorHandler((error: any, request, reply) => {
  app.log.error({ err: error, msg: 'Unhandled Exception Captured' });
  
  if (error.validation) {
     return reply.status(400).send({ error: 'Validation Error', details: error.validation });
  }

  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred.',
    ...(env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Log Request Details (Headers, Query, Body)
app.addHook('preHandler', (request, reply, done) => {
  // We log the detailed request payload here
  request.log.info({
    msg: `[REQUEST] ${request.method} ${request.url}`,
    query: request.query,
    body: request.body,
    // Only log essential headers to prevent massive clutter
    headers: {
      'content-type': request.headers['content-type'],
      'user-agent': request.headers['user-agent'],
      'x-device-id': request.headers['x-device-id']
    }
  });
  done();
});

// Log Response Payload Details
app.addHook('onSend', (request, reply, payload, done) => {
  let loggablePayload = payload;
  
  // Safely parse JSON payloads for logging, but label buffers/streams
  if (typeof payload === 'string') {
    try { 
      loggablePayload = JSON.parse(payload); 
    } catch (e) {
      // It's a string, but not JSON
    }
  } else if (Buffer.isBuffer(payload)) {
    loggablePayload = `[Buffer: ${payload.length} bytes]`;
  } else if (payload && typeof (payload as any).pipe === 'function') {
    loggablePayload = `[Stream]`;
  }

  request.log.info({
    msg: `[RESPONSE] ${request.method} ${request.url} -> ${reply.statusCode}`,
    statusCode: reply.statusCode,
    responseTimeMs: reply.elapsedTime,
    payload: loggablePayload
  });
  
  done();
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
