import speech from '@google-cloud/speech';

const client = new speech.SpeechClient();

// Language codes supported — Model_&_API.md §3.1  
const SUPPORTED_LANGUAGE_CODES = [  
  'hi-IN', 'kn-IN', 'ta-IN', 'te-IN', 'bn-IN', 'mr-IN', 'en-IN',  
];

export async function transcribeAudio(  
  audioBuffer: Buffer,  
  langHint?: string,
): Promise<{ transcript: string; language: string }> {

  // If user selected a language, use it as primary; otherwise default to Hindi
  const primaryLang = langHint ? `${langHint}-IN` : 'hi-IN';

  const response = await client.recognize({  
    config: {  
      encoding: 'WEBM_OPUS' as any,
      sampleRateHertz: 48000,  
      languageCode: primaryLang,
      alternativeLanguageCodes: SUPPORTED_LANGUAGE_CODES.filter(l => l !== primaryLang),
      model: 'latest_long',  
      enableAutomaticPunctuation: true,  
    },  
    audio: { content: audioBuffer.toString('base64') },  
  });

  const results = (response as any)[0]?.results;
  const transcript = results?.[0]?.alternatives?.[0]?.transcript ?? '';  
  const rawLang    = results?.[0]?.languageCode ?? `${langHint ?? 'hi'}-IN`;  
  const language   = rawLang.split('-')[0];

  return { transcript, language };  
}
