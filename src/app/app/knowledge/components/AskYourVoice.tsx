'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Send, X, Play, Camera, FileText, Upload, Mic, Mail, PenLine, CheckCircle, AlertCircle, Loader2, Link } from 'lucide-react';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';

// ============================================
// TYPES
// ============================================

type MessageRole = 'user' | 'assistant' | 'system';
type SystemType = 'action-cards' | 'url-import' | 'progress' | 'success' | 'error';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  systemType?: SystemType;
  importPlatform?: string;
}

// ============================================
// CONSTANTS
// ============================================

const ACTION_CARDS = [
  { id: 'youtube', label: 'YouTube', description: 'Import videos or channel', icon: Play, type: 'inline' as const },
  { id: 'instagram', label: 'Instagram', description: 'Import posts or profile', icon: Camera, type: 'inline' as const },
  { id: 'blog', label: 'Blog', description: 'Import blog posts', icon: FileText, type: 'inline' as const },
  { id: 'paste', label: 'Paste Writing', description: 'Emails, posts, articles', icon: PenLine, type: 'modal' as const },
  { id: 'upload', label: 'Upload Files', description: 'PDF, DOCX, TXT, audio', icon: Upload, type: 'modal' as const },
  { id: 'voice', label: 'Record Voice', description: 'Speak and we\'ll transcribe', icon: Mic, type: 'modal' as const },
  { id: 'email', label: 'Import Emails', description: 'Gmail or Apple Mail export', icon: Mail, type: 'modal' as const },
];

const VOICE_PROMPTS = [
  { label: 'How strong is my voice?', prompt: 'How well do you know my voice? What areas need more content?' },
  { label: 'What do I sound like?', prompt: 'Summarize my writing voice in 3 sentences based on what you\'ve learned' },
  { label: 'What should I add next?', prompt: 'What types of content should I add to strengthen my voice profile?' },
];

let msgCounter = 0;
function nextId() { return `msg_${++msgCounter}_${Date.now()}`; }

// ============================================
// INLINE URL IMPORT FORM
// ============================================

function UrlImportForm({
  platform,
  onImport,
  onCancel,
}: {
  platform: string;
  onImport: (url: string, isOwnContent: boolean) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState('');
  const [isOwnContent, setIsOwnContent] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const placeholders: Record<string, string> = {
    youtube: 'https://youtube.com/@channel or video link',
    instagram: 'https://instagram.com/username or post link',
    blog: 'https://yourblog.com or RSS feed URL',
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-text-primary">
          Paste your {platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Instagram' : 'blog'} link
        </span>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && url.trim()) onImport(url.trim(), isOwnContent); }}
          placeholder={placeholders[platform] || 'Paste URL...'}
          className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
        />
        <button
          onClick={() => url.trim() && onImport(url.trim(), isOwnContent)}
          disabled={!url.trim()}
          className="px-4 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
        >
          Import
        </button>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={isOwnContent}
            onChange={e => setIsOwnContent(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent"
          />
          This is my own content
        </label>
        <button onClick={onCancel} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================
// IMPORT PROGRESS CARD
// ============================================

function ImportProgressCard({ platform, status, progress }: { platform: string; status: string; progress?: number }) {
  return (
    <div className="bg-bg-secondary rounded-xl p-4 border border-accent/20 space-y-2">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-accent animate-spin" />
        <span className="text-sm font-medium text-text-primary">{status}</span>
      </div>
      {progress !== undefined && (
        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 relative overflow-hidden"
            style={{ width: `${Math.max(progress, 5)}%` }}
          >
            <div className="absolute inset-0 animate-shimmer-sweep" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface AskYourVoiceProps {
  disabled?: boolean;
  kbId?: string | null;
  contentSummary?: string;
  hasContent: boolean;
  onOpenModal: (modal: 'paste' | 'upload' | 'voice' | 'email') => void;
  onImportComplete: () => void;
  knowledgeBaseId?: string;
}

export function AskYourVoice({
  disabled,
  kbId,
  contentSummary,
  hasContent,
  onOpenModal,
  onImportComplete,
  knowledgeBaseId,
}: AskYourVoiceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeImport, setActiveImport] = useState<{
    platform: string;
    jobId: string;
    status: string;
    progress: number;
  } | null>(null);
  const [showUrlForm, setShowUrlForm] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, activeImport, showUrlForm]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  // ─── Chat message sending ───
  const sendMessage = useCallback(async (query?: string) => {
    const text = (query || input).trim();
    if (!text || loading) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setMessages(prev => [...prev, { id: nextId(), role: 'user', content: text }]);
    setLoading(true);

    const history = messages
      .filter(m => m.role !== 'system')
      .slice(-6)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

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
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', content: fullContent }]);
    } catch {
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, kbId]);

  // ─── Action card handler ───
  const handleActionCard = (cardId: string) => {
    const card = ACTION_CARDS.find(c => c.id === cardId);
    if (!card) return;

    // Add user-like message showing what they chose
    setMessages(prev => [...prev, { id: nextId(), role: 'user', content: card.label }]);

    if (card.type === 'inline') {
      // URL-based: show inline form
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: `Paste your ${card.label} link below and I'll import it for you.`,
      }]);
      setShowUrlForm(cardId);
    } else {
      // Modal-based: open the appropriate modal
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: cardId === 'email'
          ? 'Opening email import — follow the instructions to upload your .mbox file.'
          : cardId === 'voice'
          ? 'Opening voice recorder — speak naturally and I\'ll transcribe it.'
          : cardId === 'paste'
          ? 'Opening text editor — paste your writing sample, email, or social post.'
          : 'Opening file uploader — drag and drop your files.',
      }]);
      onOpenModal(cardId as 'paste' | 'upload' | 'voice' | 'email');
    }
  };

  // ─── URL import handler ───
  const handleUrlImport = async (platform: string, url: string, isOwnContent: boolean) => {
    setShowUrlForm(null);

    // Normalize URL
    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setActiveImport({ platform, jobId: '', status: 'Starting import...', progress: 0 });

    try {
      const result = await api.kbContent.startSocialImport({
        platform: platform === 'blog' ? 'blog' : platform as 'youtube' | 'instagram',
        url: normalizedUrl,
        knowledgeBaseId,
        useForVoiceMatching: isOwnContent,
      });

      if (!result.success || !result.jobId) {
        throw new Error('Failed to start import');
      }

      const jobId = result.jobId;
      setActiveImport({ platform, jobId, status: 'Importing content...', progress: 10 });

      // Poll for completion
      let pollCount = 0;
      let consecutiveErrors = 0;
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.kbContent.getSocialImportStatus(jobId);
          consecutiveErrors = 0;

          if (status.job) {
            const pct = Math.min(10 + pollCount * 3, 90);
            setActiveImport(prev => prev ? { ...prev, progress: pct, status: `Importing content... (${status.job?.contentCount || 0} found)` } : null);

            if (status.job.status === 'completed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setActiveImport(null);
              setMessages(prev => [...prev, {
                id: nextId(),
                role: 'system',
                content: `Imported ${status.job!.contentCount || 0} items from ${platform}. What else would you like to add?`,
                systemType: 'success',
              }]);
              onImportComplete();
            } else if (status.job.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setActiveImport(null);
              setMessages(prev => [...prev, {
                id: nextId(),
                role: 'system',
                content: status.job!.message || 'Import failed. Please check the URL and try again.',
                systemType: 'error',
              }]);
            }
          }

          pollCount++;
          if (pollCount > 60) {
            if (pollRef.current) clearInterval(pollRef.current);
            setActiveImport(null);
            setMessages(prev => [...prev, {
              id: nextId(),
              role: 'system',
              content: 'Import is taking longer than expected. It\'s still processing in the background — check your Sources in a few minutes.',
              systemType: 'error',
            }]);
          }
        } catch (err) {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) {
            if (pollRef.current) clearInterval(pollRef.current);
            setActiveImport(null);
            setMessages(prev => [...prev, {
              id: nextId(),
              role: 'system',
              content: 'Lost connection while checking import status. The import may still be processing — check Sources in a few minutes.',
              systemType: 'error',
            }]);
          }
        }
      }, 5000);
    } catch (err) {
      setActiveImport(null);
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'system',
        content: extractErrorMessage(err, 'Failed to start import. Please check the URL and try again.'),
        systemType: 'error',
      }]);
    }
  };

  // ─── Notify chat when modal import completes ───
  const addImportResult = useCallback((type: string, message: string) => {
    setMessages(prev => [...prev, {
      id: nextId(),
      role: 'system',
      content: message,
      systemType: 'success',
    }]);
  }, []);

  // Expose addImportResult via ref-like pattern on the component
  // KnowledgeContent will call this after modal success
  (AskYourVoice as any)._addImportResult = addImportResult;

  const handleClear = () => {
    setMessages([]);
    setInput('');
    setShowUrlForm(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showActionCards = () => {
    setMessages(prev => [...prev, {
      id: nextId(),
      role: 'system',
      content: 'What would you like to add?',
      systemType: 'action-cards',
    }]);
  };

  const hasConversation = messages.length > 0;

  // ─── Render: Input bar ───
  const inputBar = (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask about your voice, add content..."
          disabled={loading}
          className="w-full pl-4 pr-4 py-3.5 text-sm border-2 border-border rounded-2xl bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all disabled:opacity-50 resize-none"
          style={{ maxHeight: '160px' }}
        />
      </div>
      <button
        onClick={() => sendMessage()}
        disabled={loading || !input.trim()}
        className="w-11 h-11 rounded-xl bg-accent hover:bg-accent/90 text-white flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );

  // ─── Render: Action cards grid ───
  const actionCardsGrid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
      {ACTION_CARDS.map(card => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={() => handleActionCard(card.id)}
            disabled={!!activeImport}
            className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left border border-border bg-bg-secondary hover:border-accent/40 hover:bg-accent/5 transition-all disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{card.label}</p>
              <p className="text-[11px] text-text-tertiary truncate">{card.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );

  // ─── Render: Welcome (no messages) ───
  if (!hasConversation) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 overflow-y-auto">
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mb-5">
            <Sparkles className="w-7 h-7 text-accent" />
          </div>

          <h2 className="text-2xl font-semibold text-text-primary mb-1">
            {hasContent ? 'How can I help build your voice?' : 'Let\'s build your voice'}
          </h2>
          <p className="text-sm text-text-secondary text-center max-w-md mb-6">
            {hasContent
              ? contentSummary || 'Add more content or ask about your voice.'
              : 'The more content you add, the better Echo matches your style. Pick a source to get started.'
            }
          </p>

          {/* Action cards */}
          <div className="mb-6">
            {actionCardsGrid}
          </div>

          {/* Voice analysis chips (only for returning users with content) */}
          {hasContent && (
            <div className="flex flex-wrap gap-2 max-w-lg justify-center mb-5">
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
        </div>

        {/* Input bar at bottom */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-t border-border">
          <div className="max-w-3xl mx-auto">
            {inputBar}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Active conversation ───
  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map(m => (
            <div key={m.id}>
              {/* System messages */}
              {m.role === 'system' ? (
                <div className="space-y-3">
                  {m.systemType === 'action-cards' && (
                    <div>
                      <p className="text-sm text-text-secondary mb-3">{m.content}</p>
                      {actionCardsGrid}
                    </div>
                  )}
                  {m.systemType === 'success' && (
                    <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">{m.content}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={showActionCards}
                            className="text-xs font-medium text-accent hover:underline"
                          >
                            Add more content
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {m.systemType === 'error' && (
                    <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/20 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-error">{m.content}</p>
                    </div>
                  )}
                  {!m.systemType && (
                    <p className="text-sm text-text-secondary">{m.content}</p>
                  )}
                </div>
              ) : (
                /* User and assistant messages */
                <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
              )}
            </div>
          ))}

          {/* Inline URL form */}
          {showUrlForm && (
            <UrlImportForm
              platform={showUrlForm}
              onImport={(url, isOwn) => handleUrlImport(showUrlForm, url, isOwn)}
              onCancel={() => setShowUrlForm(null)}
            />
          )}

          {/* Active import progress */}
          {activeImport && (
            <ImportProgressCard
              platform={activeImport.platform}
              status={activeImport.status}
              progress={activeImport.progress}
            />
          )}

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

          {/* Clear */}
          {hasConversation && !loading && !activeImport && (
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

      {/* Sticky input */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-t border-border">
        <div className="max-w-3xl mx-auto">
          {inputBar}
        </div>
      </div>
    </div>
  );
}
