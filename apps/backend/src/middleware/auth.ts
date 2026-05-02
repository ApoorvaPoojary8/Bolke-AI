import { SignJWT, jwtVerify } from 'jose';  
import { env } from '../config/env.js';  

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

export async function signToken(deviceId: string): Promise<string> {  
  return new SignJWT({ device_id: deviceId })  
    .setProtectedHeader({ alg: 'HS256' })  
    .setIssuedAt()  
    .setExpirationTime('1h')  
    .sign(SECRET);  
}

export async function verifyToken(token: string): Promise<{ device_id: string }> {  
  const { payload } = await jwtVerify(token, SECRET);  
  return payload as { device_id: string };  
}

// Fastify preHandler hook  
export async function requireAuth(request: any, reply: any): Promise<void> {  
  const authHeader = request.headers.authorization;  
  if (!authHeader?.startsWith('Bearer ')) {  
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' });  
  }  
  try {  
    const token = authHeader.slice(7);  
    const payload = await verifyToken(token);  
    request.deviceId = payload.device_id;  
  } catch {  
    return reply.status(401).send({ error: 'Invalid or expired token' });  
  }  
}
