const LANGUAGES = [  
  { code: 'hi', label: 'हिंदी',    ttsVoice: 'hi-IN-Wavenet-D' },  
  { code: 'kn', label: 'ಕನ್ನಡ',   ttsVoice: 'kn-IN-Wavenet-A' },  
  { code: 'ta', label: 'தமிழ்',    ttsVoice: 'ta-IN-Wavenet-A' },  
  { code: 'te', label: 'తెలుగు',  ttsVoice: 'te-IN-Standard-A' },  
  { code: 'bn', label: 'বাংলা',   ttsVoice: 'bn-IN-Wavenet-A' },  
  { code: 'mr', label: 'मराठी',   ttsVoice: 'mr-IN-Wavenet-A' },  
];

export function LanguageSelector({ current, onChange }) {  
  return (  
    <div style={{  
      display: 'flex',  
      gap: '8px',  
      flexWrap: 'wrap',  
      justifyContent: 'center',  
      padding: '8px 0',  
    }}>  
      {LANGUAGES.map(lang => (  
        <button  
          key={lang.code}  
          onClick={() => onChange(lang.code)}  
          style={{  
            padding: '6px 14px',  
            borderRadius: '20px',  
            border: `2px solid ${current === lang.code  
              ? 'var(--color-primary)'  
              : 'var(--color-border)'}`,  
            background: current === lang.code  
              ? 'var(--color-primary)'  
              : 'transparent',  
            color: current === lang.code  
              ? '#fff'  
              : 'var(--color-text)',  
            fontSize: '16px',  
            fontWeight: current === lang.code ? 700 : 400,  
            cursor: 'pointer',  
            transition: 'all 0.15s ease',  
          }}  
        >  
          {lang.label}  
        </button>  
      ))}  
    </div>  
  );  
}
