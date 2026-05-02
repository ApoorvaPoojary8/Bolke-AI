import React, { useState, useEffect } from 'react';  
import { ActionButton } from '../components/ActionButton';

const DOC_TYPE_LABELS = {  
  ration_card:      { icon: '🛍️', label: 'Ration Card'       },  
  hospital_record:  { icon: '🏥', label: 'Hospital Record'    },  
  pension_letter:   { icon: '👴', label: 'Pension Letter'     },  
  bank_statement:   { icon: '💰', label: 'Bank Statement'     },  
  id_card:          { icon: '🪪', label: 'ID Card'            },  
  other:            { icon: '📄', label: 'Document'           },  
};

export function ImageReplyScreen({ result, onHome, onSpeakAgain, playAudio }) {  
  const [showFull, setShowFull] = useState(false);  
  const docInfo = DOC_TYPE_LABELS[result?.document_type] ?? DOC_TYPE_LABELS.other;

  // Auto-play overview audio the moment screen appears  
  useEffect(() => {  
    if (result?.overview_audio_url) {  
      playAudio(result.overview_audio_url);  
    }  
  }, []);

  if (!result) return null;

  return (  
    <div  
      className="screen screen-enter"  
      id="screen-image-reply"  
      style={{ justifyContent: 'flex-start', paddingTop: '80px', paddingBottom: '140px' }}  
    >  
      {/* Document type icon */}  
      <div style={{ fontSize: '72px', lineHeight: 1, marginBottom: '8px' }}>  
        {docInfo.icon}  
      </div>

      {/* Document type label */}  
      <p style={{  
        fontSize: '22px', fontWeight: 700,  
        marginBottom: '4px', textAlign: 'center',  
      }}>  
        {docInfo.label}  
      </p>

      {/* Confidence */}  
      {result.confidence > 0 && (  
        <p style={{ fontSize: '14px', color: 'var(--color-disabled)', marginBottom: '16px' }}>  
          Accuracy: {Math.round(result.confidence * 100)}%  
        </p>  
      )}

      {/* Overview sentence — ONE sentence, large, spoken language */}  
      <div style={{  
        background: 'var(--color-surface)',  
        borderRadius: '16px',  
        padding: '20px 24px',  
        margin: '8px 0 16px',  
        width: '100%',  
        maxWidth: '360px',  
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',  
        textAlign: 'center',  
      }}>  
        <p style={{ fontSize: '22px', lineHeight: 1.6, color: 'var(--color-text)' }}>  
          {result.overview_text}  
        </p>  
        <p style={{ fontSize: '14px', color: 'var(--color-disabled)', marginTop: '8px' }}>  
          🔊 Auto-play ho raha hai  
        </p>  
      </div>

      {/* Toggle full translated text */}  
      <button  
        onClick={() => setShowFull(v => !v)}  
        style={{  
          background: 'none', border: 'none', cursor: 'pointer',  
          color: 'var(--color-primary)', fontSize: '18px',  
          fontWeight: 600, marginBottom: '12px',  
        }}  
      >  
        {showFull ? '▲ Kam dikhao' : '▼ Poora anuvad padhein'}  
      </button>

      {showFull && (  
        <div style={{  
          background: 'var(--color-surface)',  
          borderRadius: '12px',  
          padding: '16px',  
          width: '100%',  
          maxWidth: '360px',  
          fontSize: '16px',  
          lineHeight: 1.7,  
          color: 'var(--color-text)',  
          maxHeight: '240px',  
          overflowY: 'auto',  
          marginBottom: '16px',  
        }}>  
          <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--color-primary)' }}>  
            Anuvad (Translation):  
          </p>  
          <p>{result.translated_text}</p>  
        </div>  
      )}

      {/* Action buttons */}  
      <div style={{  
        position: 'fixed', bottom: '32px',  
        left: '50%', transform: 'translateX(-50%)',  
        display: 'flex', gap: '12px',  
        flexWrap: 'wrap', justifyContent: 'center',  
        zIndex: 20,  
      }}>  
        <ActionButton label="🎤 Kuch aur poochein" onClick={onSpeakAgain} />  
        <ActionButton label="🏠 Home" onClick={onHome} />  
      </div>  
    </div>  
  );  
}
