// Camera/file upload screen for document analysis  
import React, { useState, useRef } from 'react';  
import { ActionButton } from '../components/ActionButton';

export function ImageScreen({ onResult, onBack, speakText }) {  
  const [preview, setPreview]   = useState(null);  
  const [loading, setLoading]   = useState(false);  
  const [error, setError]       = useState(null);  
  const cameraInputRef          = useRef(null);  
  const fileInputRef            = useRef(null);  
  const selectedFileRef         = useRef(null);

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

    const lang    = localStorage.getItem('bolke_last_language') ?? 'hi';  
    const token   = localStorage.getItem('bolke_token');  
    const formData = new FormData();  
    formData.append('image', selectedFileRef.current);  
    formData.append('target_language', lang);

    try {  
      const res = await fetch(  
        `${import.meta.env.VITE_API_BASE_URL}/v1/image`,  
        {  
          method: 'POST',  
          headers: token ? { Authorization: `Bearer ${token}` } : {},  
          body: formData,  
        }  
      );

      if (!res.ok) {  
        const err = await res.json().catch(() => ({}));  
        throw new Error(err.user_message ?? 'Document nahi padh saka.');  
      }

      const data = await res.json();  
      setLoading(false);  
      onResult(data);  
    } catch (err) {  
      setLoading(false);  
      setError(err.message);  
      if (speakText) speakText(err.message, 'hi-IN');  
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
