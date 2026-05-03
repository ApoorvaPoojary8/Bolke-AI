/* BolKe — Main Application
 * Voice-first web app for low-literacy users
 * State machine: HOME → LISTENING → THINKING → REPLY → (ACTION | HOME)
 * architecture.md §4 — request lifecycle
 * design.md §3 — screen inventory
 *
 * NEW STACK: Deepgram STT + Groq LLM + Cartesia TTS + LiveKit transport
 */

import { useState, useCallback, useRef } from 'react';
import { HomeScreen }       from './screens/HomeScreen';
import { ListeningScreen }  from './screens/ListeningScreen';
import { ThinkingScreen }   from './screens/ThinkingScreen';
import { ReplyScreen }      from './screens/ReplyScreen';
import { ActionScreen }     from './screens/ActionScreen';
import { FailureScreen }    from './screens/FailureScreen';
import { ImageScreen }      from './screens/ImageScreen';
import { ImageReplyScreen } from './screens/ImageReplyScreen';
import { ChatScreen }       from './screens/ChatScreen';
import { useVoiceRecorder, useOfflineSpeech } from './hooks/useVoiceRecorder';
import { useAudioPlayer }   from './hooks/useAudioPlayer';
import { useOfflineCache }  from './hooks/useOfflineCache';
import { sendVoiceQuery, triggerAction, getDeviceId, speak, cancelActiveTTS } from './services/api';
import { STATES, DEMO_MODE } from './utils/constants';

export default function App() {
  // App state machine
  const [screen, setScreen]               = useState(STATES.HOME);
  const [response, setResponse]           = useState(null);
  const [errorMessage, setErrorMessage]   = useState(null);
  const [currentAction, setCurrentAction] = useState(null);
  const [imageResult, setImageResult]     = useState(null);

  // Hooks
  const { audioLevel, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const { isPlaying, playAudio, speakText, stopAudio } = useAudioPlayer();
  const { recentQueries, isOnline, saveQuery }          = useOfflineCache();

  // Device ID for API calls
  const deviceIdRef    = useRef(getDeviceId());
  const offlineModeRef = useRef(false);

  // ── Offline speech callback ─────────────────────────────────────────────────
  const handleOfflineSpeechResult = useCallback(async (result) => {
    offlineModeRef.current = false;

    if (result.error) {
      setErrorMessage('Offline voice failed.');
      setScreen(STATES.FAILURE);
      return;
    }

    const lang = localStorage.getItem('bolke_last_language') ?? 'hi';
    const { matchOfflineIntent } = await import('./utils/offlineIntents');
    const matched = matchOfflineIntent(result.transcript, lang);
    setResponse(matched);
    setScreen(STATES.REPLY);

    // TTS — Cartesia Sonic if key available, else browser Web Speech API
    speak(matched.reply, matched.language).catch(() => {});
  }, []);

  const { startOffline, stopOffline } = useOfflineSpeech(handleOfflineSpeechResult);

  // ── State Transitions (architecture.md §4) ──────────────────────────────────

  /** HOME → LISTENING — User presses mic button */
  const handleStartRecording = useCallback(async () => {
    try {
      cancelActiveTTS();
      stopAudio();

      if (!navigator.onLine) {
        // Offline mode — use browser STT
        offlineModeRef.current = true;
        setScreen(STATES.LISTENING);
        const langCode = (localStorage.getItem('bolke_last_language') ?? 'hi') + '-IN';
        startOffline(langCode);
        return;
      }

      await startRecording();
      setScreen(STATES.LISTENING);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setErrorMessage('Mic access denied. Please allow microphone.');
      setScreen(STATES.FAILURE);
    }
  }, [startRecording, startOffline, stopAudio, cancelActiveTTS]);

  /** LISTENING → THINKING → REPLY (or FAILURE) — User releases mic button */
  const handleStopRecording = useCallback(async () => {
    try {
      if (offlineModeRef.current) {
        stopOffline();
        return;
      }

      const audioBlob = await stopRecording();
      if (!audioBlob || audioBlob.size < 100) {
        setErrorMessage('Awaaz nahi aayi. Dobara bolen.');
        setScreen(STATES.FAILURE);
        return;
      }

      setScreen(STATES.THINKING);

      const langHint = localStorage.getItem('bolke_last_language') ?? 'hi';
      const result   = await sendVoiceQuery(audioBlob, deviceIdRef.current, langHint);

      await saveQuery(result);
      localStorage.setItem('bolke_used', 'true');

      setResponse(result);
      setScreen(STATES.REPLY);

      if (result.language) {
        localStorage.setItem('bolke_last_language', result.language);
      }

      // Auto-play audio — design.md §4.3
      if (result.reply_audio_url) {
        playAudio(result.reply_audio_url);
      } else if (result.reply_text) {
        // TTS — Cartesia Sonic if key available, else browser
        speak(result.reply_text, result.language).catch(() => {});
      }

    } catch (err) {
      console.error('Voice query failed:', err);
      setErrorMessage(err.userMessage || 'Maaf kijiye, dobara bolen.');
      setScreen(STATES.FAILURE);
      if (err.audioUrl) playAudio(err.audioUrl);
    }
  }, [stopRecording, stopOffline, saveQuery, playAudio]);

  /** REPLY → ACTION — User taps action button (FR-5.1) */
  const handleAction = useCallback(async (action) => {
    if (!action) return;

    if (action.type === 'call' && action.url) {
      window.location.href = action.url;
      return;
    }
    if (action.type === 'link' && action.url) {
      window.open(action.url, '_blank');
      return;
    }

    setCurrentAction(action);
    setScreen(STATES.ACTION);
    try {
      await triggerAction(response?.intent, { user_id: deviceIdRef.current });
    } catch (err) {
      console.warn('Action trigger failed:', err);
    }
  }, [response]);

  /** ANY → HOME */
  const handleGoHome = useCallback(() => {
    cancelActiveTTS();
    stopAudio();
    stopOffline();
    offlineModeRef.current = false;
    cancelRecording();
    setScreen(STATES.HOME);
    setResponse(null);
    setErrorMessage(null);
    setCurrentAction(null);
  }, [stopAudio, stopOffline, cancelRecording, cancelActiveTTS]);

  /** FAILURE/REPLY → LISTENING */
  const handleSpeakAgain = useCallback(() => {
    stopAudio();
    setResponse(null);
    setErrorMessage(null);
    handleStartRecording();
  }, [stopAudio, handleStartRecording]);

  /** Speak thinking voice cue — design.md §5.3 */
  const handleSpeakThinking = useCallback(() => {
    speak('Ek pal, soch raha hoon...', 'hi').catch(() => {});
  }, []);

  /** Speak error voice cue */
  const handleSpeakError = useCallback(() => {
    speak(errorMessage || 'Maaf kijiye, dobara bolen.', 'hi').catch(() => {});
  }, [errorMessage]);

  const handleImageResult = useCallback((result) => {
    setImageResult(result);
    setScreen(STATES.IMAGE_REPLY);
    localStorage.setItem('bolke_last_language', result.language ?? 'hi');
  }, []);

  // ── Render current screen ───────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      case STATES.HOME:
        return (
          <HomeScreen
            onStartRecording={handleStartRecording}
            onOpenImage={() => setScreen(STATES.IMAGE)}
            onOpenChat={() => setScreen(STATES.CHAT)}
            recentQueries={recentQueries}
            isOnline={isOnline}
          />
        );

      case STATES.LISTENING:
        return (
          <ListeningScreen
            audioLevel={audioLevel}
            onStopRecording={handleStopRecording}
          />
        );

      case STATES.THINKING:
        return (
          <ThinkingScreen
            onSpeakThinking={handleSpeakThinking}
          />
        );

      case STATES.REPLY:
        return (
          <ReplyScreen
            response={response}
            onAction={handleAction}
            onSpeakAgain={handleSpeakAgain}
            onBack={handleGoHome}
            isPlaying={isPlaying}
          />
        );

      case STATES.ACTION:
        return (
          <ActionScreen
            action={currentAction}
            onDone={handleGoHome}
          />
        );

      case STATES.FAILURE:
        return (
          <FailureScreen
            errorMessage={errorMessage}
            onRetry={handleSpeakAgain}
            onHome={handleGoHome}
            onSpeakError={handleSpeakError}
          />
        );

      case STATES.IMAGE:
        return (
          <ImageScreen
            onResult={handleImageResult}
            onBack={handleGoHome}
            speakText={speakText}
          />
        );

      case STATES.IMAGE_REPLY:
        return (
          <ImageReplyScreen
            result={imageResult}
            onHome={handleGoHome}
            onSpeakAgain={handleSpeakAgain}
            playAudio={playAudio}
          />
        );

      case STATES.CHAT:
        return (
          <ChatScreen
            onBack={handleGoHome}
            onOpenImage={() => setScreen(STATES.IMAGE)}
            playAudio={playAudio}
            speakText={speakText}
          />
        );

      default:
        return (
          <HomeScreen
            onStartRecording={handleStartRecording}
            onOpenImage={() => setScreen(STATES.IMAGE)}
            onOpenChat={() => setScreen(STATES.CHAT)}
            recentQueries={recentQueries}
            isOnline={isOnline}
          />
        );
    }
  };

  return (
    <>
      {/* Demo mode indicator */}
      {DEMO_MODE && (
        <div style={{
          position:     'fixed',
          top:          '8px',
          right:        '8px',
          background:   'rgba(255, 122, 41, 0.9)',
          color:        'white',
          padding:      '4px 12px',
          borderRadius: '12px',
          fontSize:     '12px',
          fontWeight:   700,
          zIndex:       1000,
          letterSpacing: '0.5px',
        }}>
          DEMO MODE
        </div>
      )}
      {renderScreen()}
    </>
  );
}
