/* BolKe Voice Recorder Hook
 * Replaces Android MediaRecorder + OpusEncoder
 * Uses Web MediaRecorder API with WebM/Opus encoding
 * Max 15 seconds — PRD FR-1.5
 */

import { useState, useRef, useCallback } from 'react';
import { MAX_RECORDING_SECONDS } from '../utils/constants';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);

  // Monitor audio levels for visual feedback
  const monitorLevels = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // Calculate RMS amplitude
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    setAudioLevel(Math.min(1, rms * 3)); // Normalize to 0-1

    if (mediaRecorderRef.current?.state === 'recording') {
      animFrameRef.current = requestAnimationFrame(monitorLevels);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Request microphone — design.md: single tap starts recording
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,        // Mono — architecture.md §3.1
          sampleRate: 16000,      // 16kHz — architecture.md §3.1
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Set up audio analyser for amplitude visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Choose best available codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'; // iOS Safari fallback

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 32000, // Low bitrate for 2G/3G
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start amplitude monitoring
      monitorLevels();

      // Auto-stop after MAX_RECORDING_SECONDS — PRD FR-1.5
      timerRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_SECONDS * 1000);

    } catch (err) {
      console.error('Mic access denied:', err);
      setError('mic_denied');
      throw err;
    }
  }, [monitorLevels]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        setAudioLevel(0);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType,
        });

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        setAudioLevel(0);
        chunksRef.current = [];

        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  return {
    isRecording,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

// ── OFFLINE FALLBACK ─────────────────────────────────────────────────────────  
// Called when: navigator.onLine === false OR backend returns STT_FAILED

export function useOfflineSpeech(onResult) {  
  const recognitionRef = useRef(null);

  const startOffline = useCallback((langCode = 'hi-IN') => {  
    const SpeechRecognition =  
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {  
      onResult({ transcript: '', error: 'no_browser_stt' });  
      return;  
    }

    const rec = new SpeechRecognition();  
    recognitionRef.current = rec;

    rec.lang = langCode;           // e.g. 'hi-IN', 'kn-IN', 'ta-IN'  
    rec.continuous = false;  
    rec.interimResults = false;  
    rec.maxAlternatives = 3;       // get top 3 guesses for dialect variety

    rec.onresult = (event) => {  
      // Pick highest confidence result  
      const best = Array.from(event.results[0])  
        .sort((a, b) => b.confidence - a.confidence)[0];  
      onResult({ transcript: best.transcript, confidence: best.confidence });  
    };

    rec.onerror = (event) => {  
      onResult({ transcript: '', error: event.error });  
    };

    rec.start();  
  }, [onResult]);

  const stopOffline = useCallback(() => {  
    recognitionRef.current?.stop();  
  }, []);

  return { startOffline, stopOffline };  
}
