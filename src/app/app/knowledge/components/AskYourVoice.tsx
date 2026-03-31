'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Send, X, Play, Camera, FileText, Upload, Mic, Mail, PenLine, CheckCircle, AlertCircle, Loader2, Link, ArrowRight, Share2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';

// ============================================
// TYPES
// ============================================

type MessageRole = 'user' | 'assistant' | 'system';
type SystemType = 'action-cards' | 'sub-choices' | 'url-import' | 'progress' | 'success' | 'error';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  systemType?: SystemType;
  importPlatform?: string;
  subChoices?: Array<{ id: string; label: string; icon: any; modal?: string }>;
}

// ============================================
// CONSTANTS
// ============================================

const SOCIALS_CHOICES = [
  { id: 'youtube', label: 'YouTube', icon: Play },
  { id: 'instagram', label: 'Instagram', icon: Camera },
];

const WRITING_CHOICES = [
  { id: 'paste', label: 'Paste Text', icon: PenLine, modal: 'paste' },
  { id: 'upload', label: 'Upload Files', icon: Upload, modal: 'upload' },
  { id: 'blog', label: 'Import Blog', icon: FileText },
  { id: 'email', label: 'Import Emails', icon: Mail, modal: 'email' },
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

  useEffect(() => { inputRef.current?.focus(); }, []);

  const placeholders: Record<string, string> = {
    youtube: 'https://youtube.com/@channel or video link',
    instagram: 'https://instagram.com/username or post link',
    blog: 'https://yourblog.com or RSS feed URL',
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/[0.06] space-y-3">
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
          className="flex-1 px-4 py-3 text-sm border border-white/10 rounded-xl bg-white/[0.03] focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all text-text-primary placeholder:text-text-tertiary"
        />
        <button
          onClick={() => url.trim() && onImport(url.trim(), isOwnContent)}
          disabled={!url.trim()}
          className="px-5 py-3 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-all disabled:opacity-40"
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
            className="w-3.5 h-3.5 rounded border-white/20 text-accent focus:ring-accent bg-transparent"
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
// IMPORT PROGRESS CARD (Stitch design)
// ============================================

function ImportProgressCard({ status, progress, count }: { status: string; progress?: number; count?: number }) {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-xl bg-accent-purple/10 border border-accent-purple/20 p-6 rounded-[2rem] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-accent-purple animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">{status}</p>
              {count !== undefined && <p className="text-sm text-text-secondary">{count} found</p>}
            </div>
          </div>
          {progress !== undefined && (
            <span className="text-xl font-bold text-accent tabular-nums">{progress}%</span>
          )}
        </div>
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
            style={{
              width: `${Math.max(progress || 0, 5)}%`,
              background: 'linear-gradient(90deg, #00677e 0%, #00d4ff 50%, #00677e 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// ECHO AVATAR
// ============================================

function EchoAvatar({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const iconSize = size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  return (
    <div className={`${dim} rounded-full bg-accent flex items-center justify-center flex-shrink-0`}
      style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)' }}>
      <Sparkles className={`${iconSize} text-white`} />
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
    status: string;
    progress: number;
    count?: number;
  } | null>(null);
  const [showUrlForm, setShowUrlForm] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, activeImport, showUrlForm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  // ─── Chat ───
  const sendMessage = useCallback(async (query?: string) => {
    const text = (query || input).trim();
    if (!text || loading) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setMessages(prev => [...prev, { id: nextId(), role: 'user', content: text }]);
    setLoading(true);

    const history = messages.filter(m => m.role !== 'system').slice(-6)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

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
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', content: fullContent }]);
    } catch {
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally { setLoading(false); }
  }, [input, loading, messages, kbId]);

  // ─── 3-bucket handlers ───
  const handleConnectSocials = () => {
    setMessages(prev => [...prev,
      { id: nextId(), role: 'user', content: 'Connect my Socials' },
      { id: nextId(), role: 'assistant', content: 'Which platform would you like to import from?' },
      { id: nextId(), role: 'system', content: '', systemType: 'sub-choices', subChoices: SOCIALS_CHOICES },
    ]);
  };

  const handleImportWriting = () => {
    setMessages(prev => [...prev,
      { id: nextId(), role: 'user', content: 'Import my Writing' },
      { id: nextId(), role: 'assistant', content: 'What would you like to import? You can paste text, upload files, or import from a blog or email archive.' },
      { id: nextId(), role: 'system', content: '', systemType: 'sub-choices', subChoices: WRITING_CHOICES },
    ]);
  };

  const handleRecordVoice = () => {
    setMessages(prev => [...prev,
      { id: nextId(), role: 'user', content: 'Record a Voice Note' },
      { id: nextId(), role: 'assistant', content: 'Opening the voice recorder — speak naturally and I\'ll transcribe it to learn your tone.' },
    ]);
    onOpenModal('voice');
  };

  // ─── Sub-choice handler ───
  const handleSubChoice = (choice: { id: string; label: string; modal?: string }) => {
    setMessages(prev => [...prev, { id: nextId(), role: 'user', content: choice.label }]);

    if (choice.modal) {
      setMessages(prev => [...prev, {
        id: nextId(), role: 'assistant',
        content: choice.id === 'email'
          ? 'Opening email import — follow the instructions to upload your .mbox file.'
          : choice.id === 'paste'
          ? 'Opening the text editor — paste your writing sample, email, or social post.'
          : 'Opening the file uploader — drag and drop your files.',
      }]);
      onOpenModal(choice.modal as 'paste' | 'upload' | 'voice' | 'email');
    } else {
      // URL-based: youtube, instagram, blog
      setMessages(prev => [...prev, {
        id: nextId(), role: 'assistant',
        content: choice.id === 'youtube'
          ? 'YouTube transcripts are perfect for capturing your natural speaking rhythm. Paste a link to your channel or a specific video below.'
          : choice.id === 'instagram'
          ? 'Paste a link to your Instagram profile or a specific post below.'
          : 'Paste your blog URL or RSS feed link below and I\'ll import your posts.',
      }]);
      setShowUrlForm(choice.id);
    }
  };

  // ─── URL import ───
  const handleUrlImport = async (platform: string, url: string, isOwnContent: boolean) => {
    setShowUrlForm(null);
    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

    setActiveImport({ platform, status: 'Starting import...', progress: 0 });

    try {
      const result = await api.kbContent.startSocialImport({
        platform: platform === 'blog' ? 'blog' : platform as 'youtube' | 'instagram',
        url: normalizedUrl,
        knowledgeBaseId,
        useForVoiceMatching: isOwnContent,
      });

      if (!result.success || !result.jobId) throw new Error('Failed to start import');

      const jobId = result.jobId;
      setActiveImport({ platform, status: 'Importing content...', progress: 10 });

      let pollCount = 0;
      let consecutiveErrors = 0;
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.kbContent.getSocialImportStatus(jobId);
          consecutiveErrors = 0;
          if (status.job) {
            const pct = Math.min(10 + pollCount * 3, 90);
            setActiveImport(prev => prev ? { ...prev, progress: pct, status: 'Importing content...', count: status.job?.contentCount } : null);

            if (status.job.status === 'completed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setActiveImport(null);
              setMessages(prev => [...prev, {
                id: nextId(), role: 'system',
                content: `Imported ${status.job!.contentCount || 0} items from ${platform}. I'm now extracting patterns from your content. What else would you like to add?`,
                systemType: 'success',
              }]);
              onImportComplete();
            } else if (status.job.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setActiveImport(null);
              setMessages(prev => [...prev, { id: nextId(), role: 'system', content: status.job!.message || 'Import failed. Please check the URL and try again.', systemType: 'error' }]);
            }
          }
          pollCount++;
          if (pollCount > 60) {
            if (pollRef.current) clearInterval(pollRef.current);
            setActiveImport(null);
            setMessages(prev => [...prev, { id: nextId(), role: 'system', content: 'Import is taking longer than expected. It\'s still processing in the background — check your Sources in a few minutes.', systemType: 'error' }]);
          }
        } catch {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) {
            if (pollRef.current) clearInterval(pollRef.current);
            setActiveImport(null);
            setMessages(prev => [...prev, { id: nextId(), role: 'system', content: 'Lost connection while checking import status. The import may still be processing.', systemType: 'error' }]);
          }
        }
      }, 5000);
    } catch (err) {
      setActiveImport(null);
      setMessages(prev => [...prev, { id: nextId(), role: 'system', content: extractErrorMessage(err, 'Failed to start import. Please check the URL and try again.'), systemType: 'error' }]);
    }
  };

  // ─── Modal success callback ───
  const addImportResult = useCallback((type: string, message: string) => {
    setMessages(prev => [...prev, { id: nextId(), role: 'system', content: message, systemType: 'success' }]);
  }, []);
  (AskYourVoice as any)._addImportResult = addImportResult;

  const handleClear = () => {
    setMessages([]);
    setInput('');
    setShowUrlForm(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const showActionCards = () => {
    setMessages(prev => [...prev, {
      id: nextId(), role: 'system', content: 'What would you like to add?', systemType: 'action-cards',
    }]);
  };

  const hasConversation = messages.length > 0;

  // ─── Input bar (Stitch: gradient glow aura) ───
  const inputBar = (
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-accent to-accent-purple rounded-[2rem] opacity-20 group-focus-within:opacity-40 transition-opacity blur-lg" />
      <div className="relative bg-card border border-white/10 dark:border-white/10 rounded-[2rem] flex items-center p-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Message Echo..."
          disabled={loading}
          className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary py-3 px-4 resize-none text-sm placeholder:text-text-tertiary"
          style={{ maxHeight: '160px' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="w-11 h-11 rounded-2xl bg-accent text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ─── 3 big action cards (Stitch design) ───
  const actionCards = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
      {/* Connect Socials */}
      <button
        onClick={handleConnectSocials}
        disabled={!!activeImport}
        className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent/40 transition-all duration-300 text-left hover:-translate-y-1 disabled:opacity-50"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent transition-colors duration-300">
          <Share2 className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">Connect my Socials</h3>
        <p className="text-xs text-text-secondary leading-snug mb-4">Import from YouTube, Instagram, or LinkedIn.</p>
        <div className="mt-auto flex items-center text-accent text-xs font-semibold gap-1">
          Get Started <ArrowRight className="w-3 h-3" />
        </div>
      </button>

      {/* Import Writing */}
      <button
        onClick={handleImportWriting}
        disabled={!!activeImport}
        className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent-purple/40 transition-all duration-300 text-left hover:-translate-y-1 disabled:opacity-50"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
        <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mb-4 group-hover:bg-accent-purple transition-colors duration-300">
          <FileText className="w-6 h-6 text-accent-purple group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">Import my Writing</h3>
        <p className="text-xs text-text-secondary leading-snug mb-4">PDFs, articles, blog posts, or emails.</p>
        <div className="mt-auto flex items-center text-accent-purple text-xs font-semibold gap-1">
          Upload Files <ArrowRight className="w-3 h-3" />
        </div>
      </button>

      {/* Record Voice */}
      <button
        onClick={handleRecordVoice}
        disabled={!!activeImport}
        className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent/40 transition-all duration-300 text-left hover:-translate-y-1 disabled:opacity-50"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent transition-colors duration-300">
          <Mic className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">Record a Voice Note</h3>
        <p className="text-xs text-text-secondary leading-snug mb-4">Just talk — I'll pick up your tone and rhythm.</p>
        <div className="mt-auto flex items-center text-accent text-xs font-semibold gap-1">
          Start Talking <ArrowRight className="w-3 h-3" />
        </div>
      </button>
    </div>
  );

  // ─── RENDER: Welcome (no messages) ───
  if (!hasConversation) {
    return (
      <div className="flex flex-col h-full relative">
        {/* Ambient bg accents */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[120px] -z-10 rounded-full pointer-events-none" />
        <div className="absolute top-0 left-0 w-[250px] h-[250px] bg-accent-purple/5 blur-[100px] -z-10 rounded-full pointer-events-none" />

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 overflow-y-auto">
          {/* Echo greeting */}
          <div className="w-full max-w-2xl space-y-6 mb-8">
            <div className="flex gap-3 items-start">
              <EchoAvatar />
              <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-2xl rounded-tl-none border border-white/[0.06]">
                <p className="text-text-primary leading-relaxed text-sm">
                  {hasContent
                    ? 'Welcome back! Your voice profile is active. Want to add more content or explore your writing patterns?'
                    : 'Welcome to your Voice Lab. I\'m Echo, and I\'m here to learn how you think and write so I can create content that actually sounds like you.'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <EchoAvatar />
              <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-2xl rounded-tl-none border border-white/[0.06]">
                <p className="text-text-primary leading-relaxed text-sm">
                  {hasContent
                    ? 'Pick a source below to add more, or ask me anything about your voice.'
                    : 'To get started, we just need to ingest some of your past work — think of it as giving me your creative DNA. What\'s the easiest place for me to start looking?'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Action cards */}
          {actionCards}

          {/* Voice analysis chips (returning users) */}
          {hasContent && (
            <div className="flex flex-wrap gap-2 max-w-2xl justify-center mt-6">
              {VOICE_PROMPTS.map(({ label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium border border-white/10 rounded-full text-text-secondary hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <p className="text-[10px] text-text-tertiary uppercase tracking-widest mt-6">
            Select a path to begin building your voice
          </p>
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4">
          <div className="max-w-3xl mx-auto">
            {inputBar}
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Active conversation ───
  return (
    <div className="flex flex-col h-full relative">
      {/* Ambient bg */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[120px] -z-10 rounded-full pointer-events-none" />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map(m => (
            <div key={m.id}>
              {m.role === 'system' ? (
                <div className="space-y-3">
                  {m.systemType === 'action-cards' && (
                    <div>
                      <p className="text-sm text-text-secondary mb-4">{m.content}</p>
                      {actionCards}
                    </div>
                  )}
                  {m.systemType === 'sub-choices' && m.subChoices && (
                    <div className="flex flex-wrap gap-2">
                      {m.subChoices.map(choice => {
                        const Icon = choice.icon;
                        return (
                          <button
                            key={choice.id}
                            onClick={() => handleSubChoice(choice)}
                            disabled={!!activeImport}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-accent/40 hover:bg-accent/5 transition-all text-sm font-medium text-text-primary disabled:opacity-50"
                          >
                            <Icon className="w-4 h-4 text-accent" />
                            {choice.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {m.systemType === 'success' && (
                    <div className="flex items-start gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-emerald-300">{m.content}</p>
                        <button onClick={showActionCards} className="text-xs font-semibold text-accent hover:underline mt-2">
                          Add more content
                        </button>
                      </div>
                    </div>
                  )}
                  {m.systemType === 'error' && (
                    <div className="flex items-start gap-2 p-4 bg-error/10 border border-error/20 rounded-2xl">
                      <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-error">{m.content}</p>
                    </div>
                  )}
                </div>
              ) : m.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-accent text-white px-5 py-3.5 rounded-2xl rounded-tr-none text-sm font-medium"
                    style={{ boxShadow: '0 4px 20px rgba(0, 212, 255, 0.1)' }}>
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-start">
                  <EchoAvatar />
                  <div className="max-w-[80%] bg-white/[0.03] backdrop-blur-xl text-text-primary px-5 py-3.5 rounded-2xl rounded-tl-none border border-white/[0.06] text-sm leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* URL form */}
          {showUrlForm && (
            <UrlImportForm
              platform={showUrlForm}
              onImport={(url, isOwn) => handleUrlImport(showUrlForm, url, isOwn)}
              onCancel={() => setShowUrlForm(null)}
            />
          )}

          {/* Progress */}
          {activeImport && (
            <ImportProgressCard
              status={activeImport.status}
              progress={activeImport.progress}
              count={activeImport.count}
            />
          )}

          {/* Loading */}
          {loading && (
            <div className="flex gap-3 items-start">
              <EchoAvatar />
              <div className="bg-white/[0.03] backdrop-blur-xl px-5 py-3.5 rounded-2xl rounded-tl-none border border-white/[0.06]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {/* Clear */}
          {hasConversation && !loading && !activeImport && (
            <div className="flex justify-end">
              <button onClick={handleClear} className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-3xl mx-auto">
          {inputBar}
          <p className="text-center text-[10px] text-text-tertiary mt-3 uppercase tracking-widest">
            Echo uses your content to match your unique voice
          </p>
        </div>
      </div>
    </div>
  );
}
