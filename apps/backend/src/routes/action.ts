import crypto from 'crypto';

export default async function actionRoutes(app: any) {  
  app.post('/action/:intent', async (req: any, reply: any) => {  
    const { intent } = req.params;  
    const { user_location, language, ...body } = req.body;

    // Find the webhook URL for this intent  
    const webhooks = {  
      ration:     process.env.N8N_RATION_WEBHOOK,      // https://n8n.../webhook/ration-status  
      hospital:   process.env.N8N_HOSPITAL_WEBHOOK,    // https://n8n.../webhook/hospital-lookup  
      pension:    process.env.N8N_PENSION_WEBHOOK,     // https://n8n.../webhook/pension-eligibility  
      document:   process.env.N8N_DIGILOCKER_WEBHOOK,  // https://n8n.../webhook/digilocker  
    };

    const webhookUrl = webhooks[intent as keyof typeof webhooks];  
    if (!webhookUrl) {  
      return reply.status(400).send({ error: 'Unknown intent' });  
    }

    // Sign the request (HMAC from n8n)  
    const secret = process.env.N8N_WEBHOOK_SECRET || 'secret';  
    const hmac = crypto.createHmac('sha256', secret);  
    hmac.update(JSON.stringify(body));  
    const signature = hmac.digest('hex');

    try {  
      const res = await fetch(webhookUrl, {  
        method: 'POST',  
        headers: {  
          'Content-Type': 'application/json',  
          'X-Signature': signature, // n8n will verify this  
        },  
        body: JSON.stringify(body),  
      });

      const data = await res.json();  
      return reply.send(data); // { status, reply, data... }

    } catch (err) {  
      console.error('n8n webhook failed:', err);  
      return reply.status(503).send({  
        error: 'Service unavailable',  
        user_message: 'Abhi sarver busy hai, baad mein try karein',  
      });  
    }  
  });  
}
