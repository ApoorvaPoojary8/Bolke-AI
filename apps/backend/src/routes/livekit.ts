/**
 * livekit.ts — LiveKit Room Token Route
 *
 * Issues short-lived access tokens so the web client can join a
 * LiveKit room for real-time audio streaming.
 *
 * Endpoint: POST /v1/livekit/token
 * Body:     { room?: string }   (room name; defaults to device-specific room)
 * Returns:  { token: string, url: string, room: string }
 *
 * The client uses @livekit/client to connect with this token.
 * Audio flows: Browser mic → LiveKit → backend Agent → Deepgram → Groq → Cartesia → Browser
 *
 * Docs: https://docs.livekit.io/home/server/generating-tokens/
 *
 * LiveKit Cloud free tier: 100 concurrent participants, 50GB egress/month.
 */

import { AccessToken } from 'livekit-server-sdk';
import { requireAuth } from '../middleware/auth.js';

export default async function livekitRoutes(app: any) {
  app.post('/livekit/token', {
    preHandler: [requireAuth],
  }, async (req: any, reply: any) => {
    const apiKey    = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl     = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return reply.status(503).send({
        error_code:   'LIVEKIT_NOT_CONFIGURED',
        user_message: 'Real-time streaming not available.',
      });
    }

    const deviceId  = req.deviceId as string;
    const roomName  = (req.body as any)?.room ?? `bolke_${deviceId}`;
    const identity  = `user_${deviceId}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: '10m',  // token valid 10 minutes — plenty for one session
    });

    at.addGrant({
      room:            roomName,
      roomJoin:        true,
      canPublish:      true,   // user can send audio
      canSubscribe:    true,   // user can receive audio (TTS playback)
      canPublishData:  false,
    });

    const token = await at.toJwt();

    return reply.send({
      token,
      url:  wsUrl,
      room: roomName,
    });
  });
}
