import { createClient } from '@supabase/supabase-js';  
import { signToken } from '../middleware/auth.js';  
import { env } from '../config/env.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

export default async function authRoutes(app: any) {  
  // POST /v1/auth/otp — request OTP  
  app.post('/auth/otp', async (req: any, reply: any) => {  
    const { phone } = req.body;  
    if (!phone) return reply.status(400).send({ error: 'phone required' });

    const { error } = await supabase.auth.signInWithOtp({ phone });  
    if (error) return reply.status(500).send({ error: error.message });

    return reply.send({ request_id: `req_${Date.now()}`, ttl_seconds: 120 });  
  });

  // POST /v1/auth/verify — verify OTP  
  app.post('/auth/verify', async (req: any, reply: any) => {  
    const { phone, code } = req.body;  
    if (!phone || !code) return reply.status(400).send({ error: 'phone and code required' });

    const { data, error } = await supabase.auth.verifyOtp({  
      phone,  
      token: code,  
      type: 'sms',  
    });  
    if (error || !data.user) return reply.status(401).send({ error: 'Invalid OTP' });

    const token = await signToken(data.user.id);  
    return reply.send({  
      access_token: token,  
      expires_in: 3600,  
    });  
  });  

  // POST /v1/auth/anonymous — generate token for anonymous users
  app.post('/auth/anonymous', async (req: any, reply: any) => {
    const { device_id } = req.body;
    if (!device_id) return reply.status(400).send({ error: 'device_id required' });

    const token = await signToken(device_id);
    return reply.send({
      access_token: token,
      expires_in: 3600,
    });
  });
}
