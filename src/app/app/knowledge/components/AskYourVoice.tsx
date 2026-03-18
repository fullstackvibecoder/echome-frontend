'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Send, ArrowDown, X } from 'lucide-react';
import { api } from '@/lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  { label: 'Content ideas', prompt: 'Give me 5 content ideas based on what I write about' },
  { label: 'My writing style', prompt: 'Summarize my writing voice in 3 sentences' },
  { label: 'Draft a post', prompt: 'Draft a LinkedIn post about my area of expertise' },
  { label: 'Find patterns', prompt: 'What recurring themes appear in my content?' },
];

const FOLLOW_UP_PROMPTS = [
  'Make it shorter and punchier',
  'Now write a Twitter thread version',
  'What else could I write about this topic?',
  'Rewrite in a more casual tone',
];

interface AskYourVoiceProps {
  disabled?: boolean;
  kbId?: string | null;
  /** Summary line like "10 sources across voice, social, blog, email" */
  contentSummary?: string;
}

export function AskYourVoice({ disabled, kbId, contentSummary }: AskYourVoiceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Show floating button when hero input scrolls out of view
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingButton(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = useCallback(async (query?: string) => {
    const text = (query || input).trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
      const rawResponse = kbId
        ? await api.kb.chat(kbId, text, history)
        : await api.help.chat(text, history);

      let fullContent = '';
      const lines = rawResponse.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'done') break;
            if (parsed.type === 'error') { fullContent = parsed.message || 'Something went wrong.'; break; }
            if (parsed.content) fullContent += parsed.content;
            if (parsed.text) fullContent += parsed.text;
          } catch {
            if (payload && payload !== '[DONE]') fullContent += payload;
          }
        }
      }

      if (!fullContent) fullContent = 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, kbId]);

  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  const scrollToHero = () => {
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => inputRef.current?.focus(), 400);
  };

  const hasConversation = messages.length > 0;
  const lastMessageIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  return (
    <>
      {/* ─── Hero Input Section ─── */}
      <div ref={heroRef} className="mb-8">
        <div className="relative rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.04] to-transparent p-6 pb-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Ask Your Voice</h2>
              {contentSummary && !disabled && (
                <p className="text-xs text-text-tertiary">{contentSummary}</p>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="relative">
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={disabled
                  ? 'Add content to your voice profile first...'
                  : 'Draft a post, explore ideas, discover patterns in your writing...'
                }
                disabled={disabled || loading}
                className="w-full pl-4 pr-14 py-4 text-sm border-2 border-border rounded-xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={disabled || loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-accent hover:bg-accent/90 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-accent"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Suggested Prompts (only when no conversation and not disabled) */}
          {!hasConversation && !disabled && (
            <div className="flex flex-wrap gap-2 mt-3">
              {SUGGESTED_PROMPTS.map(({ label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium border border-accent/20 rounded-full bg-accent/5 text-accent hover:bg-accent/10 hover:border-accent/40 transition-all disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Conversation Thread */}
          {hasConversation && (
            <div ref={conversationRef} className="mt-4 space-y-3 max-h-[400px] overflow-y-auto scroll-smooth">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-accent text-white rounded-br-md'
                        : 'bg-bg-secondary text-text-primary rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-bg-secondary text-text-secondary px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}

              {/* Follow-up suggestions (after assistant response) */}
              {lastMessageIsAssistant && !loading && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {FOLLOW_UP_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="px-2.5 py-1 text-[11px] font-medium border border-border rounded-full text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Clear */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Floating Access Button (appears when hero scrolls out of view) ─── */}
      {showFloatingButton && !disabled && (
        <button
          onClick={scrollToHero}
          className="fixed bottom-20 right-6 z-40 w-12 h-12 rounded-full bg-accent text-white shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 hover:scale-105 transition-all flex items-center justify-center"
          title="Ask Your Voice"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
