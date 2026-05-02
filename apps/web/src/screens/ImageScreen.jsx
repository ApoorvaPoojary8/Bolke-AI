/**
 * ImageScreen.jsx — Document/image analysis using NVIDIA Vision (free)
 * Replaces the backend /v1/image endpoint with direct NVIDIA API call.
 * NVIDIA model: meta/llama-3.2-11b-vision-instruct (free API credits)
 */
import { useState, useRef } from 'react';
import { ActionButton } from '../components/ActionButton';

const LANG_NAMES = {
  hi: 'Hindi', kn: 'Kannada', ta: 'Tamil',
  te: 'Telugu', bn: 'Bengali', mr: 'Marathi', en: 'English',
};

const LANG_BCP47 = {
  hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN',
  te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', en: 'en-IN',
};

async function analyzeImageWithAI(imageFile, lang = 'hi') {
  // Convert image to base64
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const langName = LANG_NAMES[lang] || 'Hindi';
  const prompt = `You are a helpful assistant for rural Indian users who may not be literate.
Look at this document/image and explain what it is and what it says in simple ${langName}.
Keep your answer to 2-3 short sentences. Use very simple words. Do not use any English jargon.
Respond ONLY in ${langName}.`;

  const nvidiaKey = import.meta.env.VITE_NVIDIA_API_KEY;
  const nvidiaBase = import.meta.env.VITE_NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  const visionModel = import.meta.env.VITE_NVIDIA_VISION_MODEL || 'meta/llama-3.2-11b-vision-instruct';

  if (nvidiaKey) {
    try {
      const res = await fetch(`${nvidiaBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${nvidiaKey}`,
        },
        body: JSON.stringify({
          model: visionModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64}` } },
              ],
            },
          ],
          max_tokens: 250,
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? '';
        if (text) return { reply_text: text, language: lang };
      }
    } catch (e) {
      console.warn('[Vision] NVIDIA failed:', e.message);
    }
  }

  // Gemini Vision fallback
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: imageFile.type, data: base64 } },
              ],
            }],
            generationConfig: { maxOutputTokens: 250, temperature: 0.2 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) return { reply_text: text, language: lang };
      }
    } catch (e) {
      console.warn('[Vision] Gemini failed:', e.message);
    }
  }

  // Static fallback
  return {
    reply_text: 'Document ki photo samajh nahi aayi. Ek baar aur koshish karein.',
    language: lang,
  };
}

export function ImageScreen({ onResult, onBack, speakText }) {
  const [preview, setPreview]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const cameraInputRef          = useRef(null);
  const fileInputRef            = useRef(null);
  const selectedFileRef         = useRef(null);

  const lang = localStorage.getItem('bolke_last_language') ?? 'hi';

  const handleFileSelect = (file) => {
    if (!file) return;
    selectedFileRef.current = file;
    setPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedFileRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeImageWithAI(selectedFileRef.current, lang);
      setLoading(false);
      onResult(result);

      // Auto-speak the result
      if (speakText && result.reply_text) {
        speakText(result.reply_text, LANG_BCP47[lang] ?? 'hi-IN');
      }
    } catch {
      setLoading(false);
      const msg = 'Document nahi padh saka. Dobara try karein.';
      setError(msg);
      if (speakText) speakText(msg, LANG_BCP47[lang] ?? 'hi-IN');
    }
  };

  return (
    <div className="screen screen-enter" id="screen-image">
      <button className="back-button" onClick={onBack} aria-label="Back">←</button>

      <h2 style={{
        fontSize: '26px', fontWeight: 700,
        marginBottom: '24px', textAlign: 'center',
        color: 'var(--color-text)',
      }}>
        📄 Document padhein
      </h2>

      {/* Preview or upload placeholder */}
      <div
        onClick={() => cameraInputRef.current?.click()}
        style={{
          width: preview ? '100%' : '200px',
          maxWidth: '360px',
          minHeight: preview ? 'auto' : '200px',
          borderRadius: '16px',
          border: `2px dashed var(--color-primary)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'var(--color-surface)',
          cursor: 'pointer',
        }}
      >
        {preview
          ? <img src={preview} alt="Document preview" style={{ width: '100%', display: 'block' }} />
          : <span style={{ fontSize: '64px' }}>📸</span>
        }
      </div>

      {/* Camera input (mobile primary) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files[0])}
      />

      <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', marginTop: '12px' }}>
        Camera se photo lo
      </p>

      {/* File upload alternative */}
      <div style={{ margin: '12px 0', color: 'var(--color-disabled)', fontSize: '16px' }}>ya</div>

      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: 'none', border: 'none',
          color: 'var(--color-primary)', fontSize: '18px',
          fontWeight: 600, cursor: 'pointer',
        }}
      >
        📁 Gallery se choose karein
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files[0])}
      />

      {/* Error */}
      {error && (
        <p style={{ color: 'var(--color-error)', fontSize: '18px', marginTop: '16px', textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Submit / loading */}
      {preview && !loading && (
        <div style={{ marginTop: '32px' }}>
          <ActionButton label="📖 Document padhein" onClick={handleSubmit} />
        </div>
      )}

      {loading && (
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <div className="thinking-spinner" />
          <p className="label-text" style={{ marginTop: '16px' }}>
            Document padh raha hoon...
          </p>
        </div>
      )}
    </div>
  );
}
