'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Send, X, PenLine, Play } from 'lucide-react';
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
  contentSummary?: string;
  hasContent: boolean;
  onOpenSources: () => void;
}

export function AskYourVoice({ disabled, kbId, contentSummary, hasContent, onOpenSources }: AskYourVoiceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const sendMessage = useCallback(async (query?: string) => {
    const text = (query || input).trim();
    if (!text || loading) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
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
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasConversation = messages.length > 0;
  const lastMessageIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  // Input bar (reused in both states)
  const inputBar = (
    <div className="flex items-end gap-3">
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={disabled
            ? 'Add content to your voice profile first...'
            : 'Draft a post, explore ideas, discover patterns...'
          }
          disabled={disabled || loading}
          className="w-full pl-4 pr-4 py-3.5 text-sm border-2 border-border rounded-2xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          style={{ maxHeight: '160px' }}
        />
      </div>
      <button
        onClick={() => sendMessage()}
        disabled={disabled || loading || !input.trim()}
        className="w-11 h-11 rounded-xl bg-accent hover:bg-accent/90 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-accent flex-shrink-0"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );

  // ─── STATE: No content yet ───
  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mb-5">
          <Sparkles className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Build your voice</h2>
        <p className="text-sm text-text-secondary text-center max-w-md mb-6">
          Add some content so EchoMe can learn your voice. Try pasting an email or importing your YouTube videos.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onOpenSources}
            className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-lg hover:bg-accent/5 text-sm font-medium"
          >
            <PenLine className="w-4 h-4" /> Paste Text
          </button>
          <button
            onClick={onOpenSources}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 text-sm font-medium"
          >
            <Play className="w-4 h-4" /> Import YouTube
          </button>
        </div>
      </div>
    );
  }

  // ─── STATE A: Welcome (no messages yet) ───
  if (!hasConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mb-5">
          <Sparkles className="w-7 h-7 text-accent" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-text-primary mb-1">
          What would you like to create?
        </h2>
        {contentSummary && (
          <p className="text-xs text-text-tertiary mb-6">{contentSummary}</p>
        )}

        {/* Input */}
        <div className="w-full max-w-2xl mb-5">
          {inputBar}
        </div>

        {/* Suggestion chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
          {SUGGESTED_PROMPTS.map(({ label, prompt }) => (
            <button
              key={label}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="flex items-start gap-2.5 px-5 py-3 rounded-xl text-sm font-medium border border-border bg-bg-secondary hover:border-accent/40 hover:bg-accent/5 transition-all text-left disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-text-secondary">{label}</span>
            </button>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-text-tertiary mt-5">
          Uses your uploaded content to match your unique voice.
        </p>
      </div>
    );
  }

  // ─── STATE B: Active conversation ───
  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-accent text-white rounded-2xl rounded-br-md'
                    : 'bg-bg-secondary text-text-primary rounded-2xl rounded-bl-md'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-bg-secondary text-text-secondary px-4 py-3 rounded-2xl rounded-bl-md text-sm">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {/* Follow-up suggestions */}
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
          {hasConversation && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky input bar */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-t border-border">
        <div className="max-w-3xl mx-auto">
          {inputBar}
        </div>
      </div>
    </div>
  );
}
