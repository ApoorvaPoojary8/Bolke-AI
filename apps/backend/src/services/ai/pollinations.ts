// No API key required — completely free — last resort only  
export async function callPollinationsFallback(transcript: string): Promise<string> {  
  const sysEncoded  = encodeURIComponent(  
    'You are BolKe. Reply in strict JSON: {reply, intent, icon, language, action_url, confidence}'  
  );  
  const userEncoded = encodeURIComponent(transcript);  
  const url = `https://text.pollinations.ai/${userEncoded}?system=${sysEncoded}&model=openai&seed=42`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });  
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);  
  return res.text();  
}
