'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

const PUBLIC_FAQS: FAQItem[] = [
  {
    question: 'What is EchoMe?',
    answer: 'EchoMe generates content from your existing work. It reads your past writing, videos, and emails, then uses that context to produce new content that sounds like you.',
  },
  {
    question: 'How do free content kits work?',
    answer: '5 free content kits, no credit card. Each kit produces content across all platforms at once — Instagram, LinkedIn, Blog, Email, TikTok, plus a video script you can record on the built-in teleprompter.',
  },
  {
    question: 'What can I add to my Knowledge Base?',
    answer: 'Blog posts, articles, PDFs, Word docs, social media posts, email exports (.mbox), voice recordings, and YouTube/Instagram imports. More context means better output.',
  },
  {
    question: 'How is this different from ChatGPT?',
    answer: 'ChatGPT writes from prompts. EchoMe writes from your history - your actual words, ideas, and perspective. The output is grounded in what you know and how you think.',
  },
  {
    question: 'What video formats are supported?',
    answer: 'MP4, MOV, AVI, and WebM up to 5GB. The system transcribes, finds the best clips, adds captions, and generates a content kit.',
  },
  {
    question: 'How much does it cost?',
    answer: '$37/mo (Echo), $87/mo (Echo Studio), or $47/voice/mo (Echo Teams, 2-voice min). 5 free content kits to try it. Annual billing saves 17%.',
  },
];

interface HelpWidgetProps {
  isPublic?: boolean;
}

/**
 * Floating help chat widget.
 * - Authenticated mode (inside app): Full RAG chat + feedback
 * - Public mode (home page): FAQ-only with predefined Q&A pairs
 */
export function HelpWidget({ isPublic = false }: HelpWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'chat' | 'feedback'>('chat');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature_request' | 'general'>('general');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // "Need help?" label state
  const [showLabel, setShowLabel] = useState(false);
  // Pulse animation state
  const [showPulse, setShowPulse] = useState(true);

  // Show "Need help?" label on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('echome_helpWidgetSeen');
    if (!seen) {
      setShowLabel(true);
      const timer = setTimeout(() => {
        setShowLabel(false);
        localStorage.setItem('echome_helpWidgetSeen', '1');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Stop pulse after 3 cycles (~4.5s)
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  // Public FAQ expand state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when widget opens
  useEffect(() => {
    if (open && tab === 'chat' && !isPublic) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, tab, isPublic]);

  const sendMessage = useCallback(async () => {
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    // Build conversation history (last 6 messages)
    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
      const rawResponse = await api.help.chat(query, history);

      // Parse SSE response - each line is "data: ..." or "data: [DONE]"
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
            // Plain text chunk
            if (payload && payload !== '[DONE]') fullContent += payload;
          }
        }
      }

      if (!fullContent) fullContent = 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      const errorMsg = axiosErr.response?.status === 429
        ? 'Rate limited. Please wait a moment and try again.'
        : 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    try {
      await api.help.submitFeedback({
        category: feedbackCategory,
        text: feedbackText.trim(),
        pageContext: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
      setFeedbackSent(true);
      setFeedbackText('');
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch {
      // Silently fail
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* "Need help?" label */}
        {showLabel && !open && (
          <span className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in whitespace-nowrap">
            Need help?
          </span>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105"
          aria-label={open ? 'Close help' : 'Open help'}
        >
          {/* Pulse ring animation */}
          {showPulse && !open && (
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
          )}
          <span className="relative">
            {open ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              /* Chat bubble icon */
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            )}
          </span>
        </button>
      </div>

      {/* Chat / FAQ panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            {isPublic ? (
              <p className="text-sm font-semibold text-foreground">Frequently Asked Questions</p>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={() => setTab('chat')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    tab === 'chat' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Help Chat
                </button>
                <button
                  onClick={() => setTab('feedback')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    tab === 'feedback' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Feedback
                </button>
              </div>
            )}
          </div>

          {isPublic ? (
            /* Public FAQ mode */
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[280px] max-h-[400px]">
              {PUBLIC_FAQS.map((faq, i) => (
                <div key={i} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                  >
                    <span>{faq.question}</span>
                    <svg
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${expandedFaq === i ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedFaq === i && (
                    <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-3 text-center">
                <a
                  href="/auth/signup"
                  className="inline-block px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Try EchoMe Free
                </a>
              </div>
            </div>
          ) : tab === 'chat' ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[350px]">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">Ask anything about EchoMe.</p>
                    <div className="mt-3 space-y-1.5">
                      {['How do I upload a video?', 'What file types are supported?', 'How does the AI generate content?'].map(q => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); setTimeout(() => sendMessage(), 50); }}
                          className="block w-full text-left px-3 py-2 text-xs text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground px-3 py-2 rounded-xl rounded-bl-md text-sm">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border bg-muted/30">
                <form
                  onSubmit={e => { e.preventDefault(); sendMessage(); }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Feedback tab */
            <div className="p-4 space-y-3 min-h-[280px]">
              {feedbackSent ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-2xl mb-2">Thanks!</p>
                    <p className="text-sm text-muted-foreground">Your feedback has been submitted.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                    <select
                      value={feedbackCategory}
                      onChange={e => setFeedbackCategory(e.target.value as typeof feedbackCategory)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="general">General</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature_request">Feature Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                    <textarea
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      placeholder="Tell us what you think..."
                      rows={5}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim()}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                  >
                    Submit Feedback
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
