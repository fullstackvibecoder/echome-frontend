'use client';

import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  'Give me 5 LinkedIn post ideas',
  'What topics do I write about most?',
  'Summarize my voice in 3 sentences',
  'Draft an intro for my next newsletter',
];

interface AskYourVoiceProps {
  disabled?: boolean;
}

export function AskYourVoice({ disabled }: AskYourVoiceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = useCallback(async (query?: string) => {
    const text = (query || input).trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
      const rawResponse = await api.help.chat(text, history);

      let fullContent = '';
      const lines = rawResponse.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
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
  }, [input, loading, messages]);

  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="mb-6">
      {/* Input bar */}
      <div className="relative">
        <form onSubmit={e => { e.preventDefault(); sendMessage(); }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={disabled ? 'Add content to start asking your voice...' : 'Ask your voice anything...'}
            disabled={disabled || loading}
            className="w-full pl-10 pr-20 py-3.5 text-sm border border-border rounded-xl input-glow bg-bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">🔍</span>
          <button
            type="submit"
            disabled={disabled || loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {loading ? '...' : 'Ask'}
          </button>
        </form>
      </div>

      {/* Suggested prompts (only when no conversation) */}
      {!hasConversation && !disabled && (
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTED_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="px-3 py-1.5 text-xs border border-border rounded-full hover:border-accent hover:bg-accent/5 text-text-secondary hover:text-text-primary transition-all disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Conversation */}
      {hasConversation && (
        <div className="mt-3 card p-4 animate-fade-in space-y-3 max-h-80 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
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
              <div className="bg-bg-secondary text-text-secondary px-3 py-2 rounded-xl rounded-bl-md text-sm">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleClear}
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              Clear conversation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
