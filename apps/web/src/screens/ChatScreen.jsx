/* BolKe Animated AI Chat Screen
 * Converted from TypeScript/Next.js to React JSX for Vite
 * Uses framer-motion + lucide-react + Tailwind CSS
 * Wired to POST /v1/chat backend route
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { cn } from '../utils/cn';
import {
  ImageIcon,
  MonitorIcon,
  Paperclip,
  SendIcon,
  XIcon,
  LoaderIcon,
  Sparkles,
  Command,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessage } from '../services/api';
import { ICON_MAP } from '../utils/constants';

// ─── Auto-resize textarea hook ───
function useAutoResizeTextarea({ minHeight, maxHeight }) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(
    (reset) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) textarea.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

// ─── Command suggestions ───
const COMMAND_SUGGESTIONS = [
  {
    icon: <ImageIcon className="w-4 h-4" />,
    label: 'Document',
    description: 'Upload a document image',
    prefix: '/document',
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    label: 'Ration',
    description: 'Check ration card status',
    prefix: '/ration',
  },
  {
    icon: <MonitorIcon className="w-4 h-4" />,
    label: 'Hospital',
    description: 'Find nearby hospital',
    prefix: '/hospital',
  },
  {
    icon: <MessageSquare className="w-4 h-4" />,
    label: 'Pension',
    description: 'Check pension eligibility',
    prefix: '/pension',
  },
];

export function ChatScreen({ onBack, onOpenImage, playAudio, speakText }) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = useState(false);
  const [messages, setMessages] = useState([]);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });
  const commandPaletteRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Command palette logic
  useEffect(() => {
    if (value.startsWith('/') && !value.includes(' ')) {
      setShowCommandPalette(true);
      const idx = COMMAND_SUGGESTIONS.findIndex((cmd) =>
        cmd.prefix.startsWith(value)
      );
      setActiveSuggestion(idx >= 0 ? idx : -1);
    } else {
      setShowCommandPalette(false);
    }
  }, [value]);

  // Track mouse for glow effect
  useEffect(() => {
    const handleMouseMove = (e) =>
      setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Close command palette on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      const commandButton = document.querySelector('[data-command-button]');
      if (
        commandPaletteRef.current &&
        !commandPaletteRef.current.contains(event.target) &&
        !commandButton?.contains(event.target)
      ) {
        setShowCommandPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (showCommandPalette) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev < COMMAND_SUGGESTIONS.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((prev) =>
          prev > 0 ? prev - 1 : COMMAND_SUGGESTIONS.length - 1
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          selectCommandSuggestion(activeSuggestion);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPalette(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!value.trim() || isTyping) return;

    const userMessage = value.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setValue('');
    adjustHeight(true);
    setIsTyping(true);

    try {
      const lang = localStorage.getItem('bolke_last_language') ?? 'hi';
      const result = await sendChatMessage(userMessage, lang);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: result.reply_text,
          intent: result.intent,
          icon: result.icon,
          audioUrl: result.reply_audio_url,
          action: result.action,
          confidence: result.confidence,
        },
      ]);

      // Auto-play the reply audio
      if (result.reply_audio_url) {
        playAudio(result.reply_audio_url);
      } else if (result.reply_text) {
        const langMap = { hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', en: 'en-IN' };
        speakText(result.reply_text, langMap[result.language] || 'hi-IN');
      }

      // Save language
      if (result.language) {
        localStorage.setItem('bolke_last_language', result.language);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err.userMessage || 'Maaf kijiye, dobara likhein.', isError: true },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAttachFile = () => {
    // Open the image screen for document upload
    if (onOpenImage) onOpenImage();
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const selectCommandSuggestion = (index) => {
    const selected = COMMAND_SUGGESTIONS[index];

    if (selected.prefix === '/document') {
      if (onOpenImage) onOpenImage();
      return;
    }

    // Fill in the command as a text query
    const queryMap = {
      '/ration': 'mera ration card ka kya status hai',
      '/hospital': 'pass mein hospital kahan hai',
      '/pension': 'mujhe pension ke liye kya karna hoga',
    };
    const query = queryMap[selected.prefix] || selected.description;
    setValue(query);
    setShowCommandPalette(false);
  };

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center text-white p-4 relative overflow-hidden"
      style={{ background: '#0A0A0B' }}
    >
      {/* Ambient background glows */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse" style={{ animationDelay: '1000ms' }} />
      </div>

      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        whileTap={{ scale: 0.9 }}
      >
        <ArrowLeft className="w-5 h-5" />
      </motion.button>

      <div className="w-full max-w-2xl mx-auto relative flex flex-col" style={{ minHeight: '100dvh' }}>
        <motion.div
          className="relative z-10 flex flex-col flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Header */}
          {messages.length === 0 && (
            <div className="text-center pt-24 pb-8 space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block"
              >
                <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
                  Aap kaise madad chahte hain?
                </h1>
                <motion.div
                  className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </motion.div>
              <motion.p
                className="text-sm text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Type karein ya command use karein
              </motion.p>
            </div>
          )}

          {/* Messages area */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto pt-16 pb-4 px-2 space-y-4" style={{ maxHeight: 'calc(100dvh - 240px)' }}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-violet-600/80 text-white rounded-br-sm'
                        : msg.isError
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30 rounded-bl-sm'
                          : 'bg-white/[0.06] text-white/90 border border-white/[0.08] rounded-bl-sm'
                    )}
                  >
                    {/* Intent icon for assistant messages */}
                    {msg.role === 'assistant' && msg.icon && !msg.isError && (
                      <div className="flex items-center gap-2 mb-2 text-xs text-white/50">
                        <span>{ICON_MAP[msg.icon]?.emoji || '💬'}</span>
                        <span className="capitalize">{msg.intent || 'reply'}</span>
                        {msg.confidence > 0 && (
                          <span className="ml-auto opacity-50">
                            {Math.round(msg.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    )}
                    <p style={{ fontSize: '15px', lineHeight: 1.6 }}>{msg.text}</p>
                    {/* Action button */}
                    {msg.action && (
                      <a
                        href={msg.action.url}
                        className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg bg-white/10 text-xs text-violet-300 hover:bg-white/20 transition-colors"
                      >
                        📞 {msg.action.label}
                      </a>
                    )}
                    {/* Replay audio */}
                    {msg.audioUrl && (
                      <button
                        onClick={() => playAudio(msg.audioUrl)}
                        className="inline-flex items-center gap-1 mt-2 ml-2 px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white/60 hover:bg-white/20 transition-colors"
                      >
                        🔊 Replay
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Spacer if no messages */}
          {messages.length === 0 && <div className="flex-1" />}

          {/* Input box */}
          <div className="sticky bottom-0 pb-4 pt-2">
            <motion.div
              className="relative backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl"
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* Command palette */}
              <AnimatePresence>
                {showCommandPalette && (
                  <motion.div
                    ref={commandPaletteRef}
                    className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-black/90 rounded-lg z-50 shadow-lg border border-white/10 overflow-hidden"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="py-1 bg-black/95">
                      {COMMAND_SUGGESTIONS.map((suggestion, index) => (
                        <motion.div
                          key={suggestion.prefix}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer',
                            activeSuggestion === index
                              ? 'bg-white/10 text-white'
                              : 'text-white/70 hover:bg-white/5'
                          )}
                          onClick={() => selectCommandSuggestion(index)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <div className="w-5 h-5 flex items-center justify-center text-white/60">
                            {suggestion.icon}
                          </div>
                          <div className="font-medium">{suggestion.label}</div>
                          <div className="text-white/40 text-xs ml-1">
                            {suggestion.description}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Textarea */}
              <div className="p-4">
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="BolKe se poochein..."
                  className={cn(
                    'w-full px-4 py-3',
                    'resize-none',
                    'bg-transparent',
                    'border-none',
                    'text-white/90 text-sm',
                    'focus:outline-none',
                    'placeholder:text-white/20',
                    'min-h-[60px]'
                  )}
                  style={{ overflow: 'hidden', minHeight: '60px' }}
                />
              </div>

              {/* Attachments */}
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div
                    className="px-4 pb-3 flex gap-2 flex-wrap"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {attachments.map((file, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-3 rounded-lg text-white/70"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <span>{file}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toolbar */}
              <div className="p-4 border-t border-white/[0.05] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={handleAttachFile}
                    whileTap={{ scale: 0.94 }}
                    className="p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group"
                  >
                    <Paperclip className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    type="button"
                    data-command-button="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCommandPalette((prev) => !prev);
                    }}
                    whileTap={{ scale: 0.94 }}
                    className={cn(
                      'p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors relative group',
                      showCommandPalette && 'bg-white/10 text-white/90'
                    )}
                  >
                    <Command className="w-4 h-4" />
                  </motion.button>
                </div>

                <motion.button
                  type="button"
                  onClick={handleSendMessage}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isTyping || !value.trim()}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    'flex items-center gap-2',
                    value.trim()
                      ? 'bg-white text-[#0A0A0B] shadow-lg shadow-white/10'
                      : 'bg-white/[0.05] text-white/40'
                  )}
                >
                  {isTyping ? (
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <SendIcon className="w-4 h-4" />
                  )}
                  <span>Bhejein</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Quick action buttons */}
            {messages.length === 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {COMMAND_SUGGESTIONS.map((suggestion, index) => (
                  <motion.button
                    key={suggestion.prefix}
                    onClick={() => selectCommandSuggestion(index)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg text-sm text-white/60 hover:text-white/90 transition-all relative group border border-white/[0.05]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {suggestion.icon}
                    <span>{suggestion.label}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Thinking indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05] z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-7 rounded-full bg-white/[0.05] flex items-center justify-center">
                <span className="text-xs font-medium text-white/90">BK</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>Soch raha hoon</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse glow effect */}
      {inputFocused && (
        <motion.div
          className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
          animate={{
            x: mousePosition.x - 400,
            y: mousePosition.y - 400,
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: 'easeInOut',
          }}
          style={{
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.3)',
          }}
        />
      ))}
    </div>
  );
}
