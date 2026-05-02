/* BolKe Audio Player Hook
 * Replaces Android ExoPlayer for TTS playback
 * Uses HTML5 Audio element — FR-4.1
 * Auto-plays on reply — design.md §4.3
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  /**
   * Play audio from URL
   * Auto-play is safe because mic tap counts as user interaction
   */
  const playAudio = useCallback(async (url) => {
    if (!url) return;

    try {
      setIsLoading(true);

      // Create fresh audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.oncanplaythrough = () => setIsLoading(false);
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        console.warn('Audio playback error');
      };

      await audio.play();
    } catch (err) {
      console.warn('Audio play failed:', err);
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, []);

  /**
   * Speak text using browser's Speech Synthesis API
   * Fallback when no audio URL is available (demo mode)
   */
  const speakText = useCallback((text, lang = 'hi-IN') => {
    if (!text || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly slower — design.md §5.1
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  return {
    isPlaying,
    isLoading,
    playAudio,
    speakText,
    stopAudio,
  };
}
