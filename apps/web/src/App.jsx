/* BolKe — Main Application
 * Voice-first web app for low-literacy users
 * State machine: HOME → LISTENING → THINKING → REPLY → (ACTION | HOME)
 * architecture.md §4 — request lifecycle
 * design.md §3 — screen inventory
 */

import React, { useState, useCallback, useRef } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { ListeningScreen } from './screens/ListeningScreen';
import { ThinkingScreen } from './screens/ThinkingScreen';
import { ReplyScreen } from './screens/ReplyScreen';
import { ActionScreen } from './screens/ActionScreen';
import { FailureScreen } from './screens/FailureScreen';
import { ImageScreen } from './screens/ImageScreen';
import { ImageReplyScreen } from './screens/ImageReplyScreen';
import { ChatScreen } from './screens/ChatScreen';
import { useVoiceRecorder, useOfflineSpeech } from './hooks/useVoiceRecorder';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useOfflineCache } from './hooks/useOfflineCache';
import { sendVoiceQuery, triggerAction, getDeviceId } from './services/api';
import { STATES, DEMO_MODE } from './utils/constants';

export default function App() {
  // App state machine
  const [screen, setScreen] = useState(STATES.HOME);
  const [response, setResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentAction, setCurrentAction] = useState(null);

  // Hooks
  const { isRecording, audioLevel, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const { startOffline, stopOffline } = useOfflineSpeech(async (result) => {
    // This callback is triggered when offline speech recognition finishes
    if (result.error) {
      setErrorMessage('Offline voice failed.');
      setScreen(STATES.FAILURE);
      return;
    }
    
    // Process the offline text
    const lang = localStorage.getItem('bolke_last_language') ?? 'hi';
    const { matchOfflineIntent } = await import('./utils/offlineIntents');
    const matched = matchOfflineIntent(result.transcript, lang);
    setResponse(matched);
    setScreen(STATES.REPLY);
    
    // Offline TTS using Web Speech API
    const langMap = { hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', en: 'en-IN' };
    speakText(matched.reply, langMap[matched.language] || 'hi-IN');
  });
  const { isPlaying, playAudio, speakText, stopAudio } = useAudioPlayer();
  const { recentQueries, isOnline, saveQuery } = useOfflineCache();

  // Device ID for API calls
  const deviceIdRef = useRef(getDeviceId());

  // ──────────────────────────────────────
  // State Transitions (architecture.md §4)
  // ──────────────────────────────────────

  /**
   * HOME → LISTENING
   * User presses mic button
   */
  const handleStartRecording = useCallback(async () => {
    try {
      stopAudio();
      
      if (!navigator.onLine) {
        // Offline mode — use browser STT
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
  }, [startRecording, stopAudio]);

  /**
   * LISTENING → THINKING → REPLY (or FAILURE)
   * User releases mic button
   */
  const handleStopRecording = useCallback(async () => {
    try {
      const audioBlob = await stopRecording();
      if (!audioBlob || audioBlob.size < 100) {
        // Recording too short
        setErrorMessage('Awaaz nahi aayi. Dobara bolen.');
        setScreen(STATES.FAILURE);
        return;
      }

      // Move to thinking state
      setScreen(STATES.THINKING);

      // Send to backend — architecture.md §4 steps 2-10
      const langHint = localStorage.getItem('bolke_last_language') ?? 'hi';
      const result = await sendVoiceQuery(
        audioBlob,
        deviceIdRef.current,
        langHint,
      );

      // Cache the result for offline — PRD FR-6.2
      await saveQuery(result);

      // Mark first use
      localStorage.setItem('bolke_used', 'true');

      // Set response and move to reply screen
      setResponse(result);
      setScreen(STATES.REPLY);
      
      // Update the last used language
      if (result.language) {
        localStorage.setItem('bolke_last_language', result.language);
      }

      // Auto-play audio — design.md §4.3 "voice plays the moment screen appears"
      if (result.reply_audio_url) {
        playAudio(result.reply_audio_url);
      } else if (result.reply_text) {
        // Fallback: use browser TTS (demo mode)
        const langMap = { hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', en: 'en-IN' };
        speakText(result.reply_text, langMap[result.language] || 'hi-IN');
      }

    } catch (err) {
      console.error('Voice query failed:', err);
      setErrorMessage(err.userMessage || 'Maaf kijiye, dobara bolen.');
      setScreen(STATES.FAILURE);

      // Play error audio if available
      if (err.audioUrl) {
        playAudio(err.audioUrl);
      }
    }
  }, [stopRecording, saveQuery, playAudio, speakText]);

  /**
   * REPLY → ACTION
   * User taps action button — FR-5.1
   */
  const handleAction = useCallback(async (action) => {
    if (!action) return;

    if (action.type === 'call' && action.url) {
      // Direct phone call
      window.location.href = action.url;
      return;
    }

    if (action.type === 'link' && action.url) {
      // External link
      window.open(action.url, '_blank');
      return;
    }

    // Trigger n8n workflow — Model_&_API.md §7.4
    setCurrentAction(action);
    setScreen(STATES.ACTION);

    try {
      await triggerAction(response?.intent, {
        user_id: deviceIdRef.current,
      });
    } catch (err) {
      console.warn('Action trigger failed:', err);
    }
  }, [response]);

  /**
   * ANY → HOME
   * Return to home screen
   */
  const handleGoHome = useCallback(() => {
    stopAudio();
    cancelRecording();
    setScreen(STATES.HOME);
    setResponse(null);
    setErrorMessage(null);
    setCurrentAction(null);
  }, [stopAudio, cancelRecording]);

  /**
   * FAILURE/REPLY → LISTENING
   * User taps "speak again"
   */
  const handleSpeakAgain = useCallback(() => {
    stopAudio();
    setResponse(null);
    setErrorMessage(null);
    handleStartRecording();
  }, [stopAudio, handleStartRecording]);

  /**
   * Speak thinking voice cue — design.md §5.3
   */
  const handleSpeakThinking = useCallback(() => {
    speakText('Ek pal, soch raha hoon...', 'hi-IN');
  }, [speakText]);

  /**
   * Speak error voice cue — design.md §5.3
   */
  const handleSpeakError = useCallback(() => {
    speakText(errorMessage || 'Maaf kijiye, dobara bolen.', 'hi-IN');
  }, [speakText, errorMessage]);

  const [imageResult, setImageResult] = useState(null);

  const handleImageResult = useCallback((result) => {
    setImageResult(result);
    setScreen(STATES.IMAGE_REPLY);
    localStorage.setItem('bolke_last_language', result.language ?? 'hi');
  }, []);

  // ──────────────────────────────────────
  // Render current screen
  // ──────────────────────────────────────
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
          position: 'fixed',
          top: '8px',
          right: '8px',
          background: 'rgba(255, 122, 41, 0.9)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 700,
          zIndex: 1000,
          letterSpacing: '0.5px',
        }}>
          DEMO MODE
        </div>
      )}
      {renderScreen()}
    </>
  );
}
