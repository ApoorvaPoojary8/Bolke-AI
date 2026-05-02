import tts from '@google-cloud/text-to-speech';

const client = new tts.TextToSpeechClient();

// Voice map — Model_&_API.md §4.1  
const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {  
  hi: { languageCode: 'hi-IN', name: 'hi-IN-Wavenet-D' },  
  kn: { languageCode: 'kn-IN', name: 'kn-IN-Wavenet-A' },  
  ta: { languageCode: 'ta-IN', name: 'ta-IN-Wavenet-A' },  
  te: { languageCode: 'te-IN', name: 'te-IN-Standard-A' },  
  bn: { languageCode: 'bn-IN', name: 'bn-IN-Wavenet-A' },  
  mr: { languageCode: 'mr-IN', name: 'mr-IN-Wavenet-A' },  
  en: { languageCode: 'en-IN', name: 'en-IN-Wavenet-D' },  
};

export async function synthesise(text: string, language: string): Promise<Buffer> {  
  const voice = VOICE_MAP[language] ?? VOICE_MAP['hi'];

  const [response] = await client.synthesizeSpeech({  
    input: { text },  
    voice,  
    audioConfig: {  
      audioEncoding: 'MP3',  
      sampleRateHertz: 24000,  
      speakingRate: 0.95, // 5% slower — design.md §5.1  
    },  
  });

  return Buffer.from(response.audioContent as Uint8Array);  
}
