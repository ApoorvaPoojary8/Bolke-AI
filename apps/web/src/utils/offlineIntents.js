// Simple keyword → intent map for offline mode  
// Covers the 5 MVP use cases without any server call

const INTENT_KEYWORDS = {  
  ration:            ['ration', 'राशन', 'ರೇಷನ್', 'রেশন', 'రేషన్'],  
  hospital:          ['hospital', 'अस्पताल', 'ಆಸ್ಪತ್ರೆ', 'হাসপাতাল', 'ఆసుపత్రి'],  
  bank:              ['bank', 'balance', 'बैंक', 'ಬ್ಯಾಂಕ್', 'ব্যাংক'],  
  pension:           ['pension', 'पेंशन', 'ಪೆನ್ಷನ್', 'পেনশন'],  
  scheme_eligibility:['scheme', 'yojana', 'योजना', 'ಯೋಜನೆ', 'যোজনা'],  
  document:          ['aadhaar', 'आधार', 'ಆಧಾರ್', 'আধার', 'digilocker'],  
};

const OFFLINE_REPLIES = {  
  ration:            { hi: 'ऑनलाइन नहीं है। राशन हेल्पलाइन 1967 पर कॉल करें।',  
                       kn: 'ಆನ್‌ಲೈನ್ ಇಲ್ಲ. ರೇಷನ್ ಸಹಾಯವಾಣಿ 1967 ಕರೆ ಮಾಡಿ.' },  
  hospital:          { hi: 'ऑनलाइन नहीं है। 108 ऐम्बुलेंस नंबर पर कॉल करें।',  
                       kn: 'ಆನ್‌ಲೈನ್ ಇಲ್ಲ. 108 ಅಂಬುಲೆನ್ಸ್ ಕರೆ ಮಾಡಿ.' },  
  bank:              { hi: 'ऑनलाइन नहीं है। अपने बैंक का टोल-फ्री नंबर डायल करें।',  
                       kn: 'ಆನ್‌ಲೈನ್ ಇಲ್ಲ. ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಟೋಲ್-ಫ್ರೀ ಸಂಖ್ಯೆ ಡಯಲ್ ಮಾಡಿ.' },  
  pension:           { hi: 'ऑनलाइन नहीं है। पेंशन हेल्पलाइन 1800-110-001 पर कॉल करें।',  
                       kn: 'ಆನ್‌ಲೈನ್ ಇಲ್ಲ. ಪೆನ್ಷನ್ ಸಹಾಯವಾಣಿ 1800-110-001 ಕರೆ ಮಾಡಿ.' },  
  unknown:           { hi: 'इंटरनेट नहीं है। बाद में कोशिश करें।',  
                       kn: 'ಇಂಟರ್ನೆಟ್ ಇಲ್ಲ. ನಂತರ ಪ್ರಯತ್ನಿಸಿ.' },  
};

export function matchOfflineIntent(transcript, language = 'hi') {  
  const lower = transcript.toLowerCase();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {  
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {  
      const replyMap = OFFLINE_REPLIES[intent] ?? OFFLINE_REPLIES.unknown;  
      const reply    = replyMap[language] ?? replyMap['hi'];  
      return {  
        intent,  
        reply,  
        icon:       intent === 'scheme_eligibility' ? 'document' : intent,  
        language,  
        action_url: null,  
        confidence: 0.6,  
        offline:    true,   // flag so frontend shows "offline mode" banner  
      };  
    }  
  }

  return {  
    intent: 'unknown',  
    reply:  OFFLINE_REPLIES.unknown[language] ?? OFFLINE_REPLIES.unknown['hi'],  
    icon:   'unknown',  
    language,  
    action_url: null,  
    confidence: 0,  
    offline: true,  
  };  
}
