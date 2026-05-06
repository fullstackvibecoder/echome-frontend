'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';

const VOICE_PROMPTS = [
  { label: 'How well do you know me?', prompt: 'Based on everything in my knowledge base, summarize my voice, my key topics, and where the gaps are.' },
  { label: 'Give me content ideas', prompt: 'Using what you know about my expertise and voice, suggest 5 content ideas I could create right now.' },
  { label: 'What should I add next?', prompt: 'What types of content am I missing that would help you sound more like me? Be specific about what to add.' },
];

// TLL-tuned prompt fired when the dashboard "Draft a Mind-Reader post" chip
// lands here with ?ask=mind-reader. Encodes anti-aggression guards from
// docs/2026-05-06-tll-methodology.md so Echo never pads or forces.
const MIND_READER_PROMPT = `Pull up to 3 fresh content angles from my knowledge base. Prioritize personal stories that meet at least one of these criteria:
(a) the niche relates,
(b) the story defines my core values, or
(c) the facts of the story led me toward real estate.

For each angle, give me:
- The angle in one sentence (lead with the symptom my audience recognizes, never the diagnosis they don't)
- A 1-2 sentence excerpt from the source that anchors it
- The source type (YouTube transcript, voice note, email, etc.)
- A note on whether this should end with a soft engagement question, a hard CTA, or no CTA at all (personal-philosophy posts often need no CTA)

Hard rules:
- If you find fewer than 3 angles that fit the criteria, return only what fits. Do not pad with generic ideas.
- Avoid industry-trend commentary unless it's anchored in something I've personally said or experienced.
- Do not invent a SignatureMethod or process name — use only names I've already used in my KB.
- If the KB is too thin for any personal-story angle, tell me honestly and suggest what to record next (a 30-second voice note about a recent client situation, a closing, or a moment that taught me something).`;

interface KBChatProps {
  kbId: string | null;
  hasContent: boolean;
}

export default function KBChat({ kbId, hasContent }: KBChatProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoFiredRef = useRef(false);
  const searchParams = useSearchParams();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = useCallback(async (query?: string) => {
    const text = (query || input).trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    const history = messages.slice(-6);

    try {
      const rawResponse = kbId ? await api.kb.chat(kbId, text, history) : await api.help.chat(text, history);
      let fullContent = '';
      for (const line of rawResponse.split('\n')) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === 'done') break;
            if (parsed.type === 'error') { fullContent = parsed.message || 'Something went wrong.'; break; }
            if (parsed.content) fullContent += parsed.content;
            if (parsed.text) fullContent += parsed.text;
          } catch { if (payload && payload !== '[DONE]') fullContent += payload; }
        }
      }
      if (!fullContent) fullContent = 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally { setLoading(false); }
  }, [input, loading, messages, kbId]);

  // Auto-fire TLL Mind-Reader prompt when user lands here from the dashboard
  // chip (URL: /app/voice?ask=mind-reader). Guarded so it only fires once
  // per mount and only when the KB has content to query.
  useEffect(() => {
    if (autoFiredRef.current) return;
    if (!kbId || !hasContent) return;
    if (searchParams.get('ask') !== 'mind-reader') return;
    autoFiredRef.current = true;
    sendMessage(MIND_READER_PROMPT);
  }, [kbId, hasContent, searchParams, sendMessage]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Ask Echo</h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setInput(''); }}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors flex-shrink-0"
            aria-label="Clear conversation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Suggestion chips */}
      {hasContent && messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {VOICE_PROMPTS.map(({ label, prompt }) => (
            <button
              key={label}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-full text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-[300px] overflow-y-auto space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-bg-secondary text-text-primary rounded-bl-md'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-bg-secondary px-4 py-2.5 rounded-2xl rounded-bl-md">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); }}
          placeholder="Ask about your voice, get content ideas, or explore what's in your KB..."
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
          aria-label="Send message"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
