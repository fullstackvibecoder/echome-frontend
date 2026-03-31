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
  // Persist messages to sessionStorage so deploys/reloads don't wipe the chat
  // Note: system messages with subChoices contain React components (icons) that can't
  // be serialized, so we filter those out on save and restore only text-based messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = sessionStorage.getItem('echome_voice_chat');
      if (!saved) return [];
      const parsed = JSON.parse(saved) as ChatMessage[];
      // Filter out system messages with subChoices (they contain non-serializable icon refs)
      // and action-cards (they'll be re-seeded)
      return parsed.filter(m =>
        m.role !== 'system' || (m.systemType !== 'sub-choices' && m.systemType !== 'action-cards')
      );
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backgroundImport, setBackgroundImport] = useState<{
    platform: string;
    jobId: string;
    status: string;
    count?: number;
  } | null>(null);
  const [showUrlForm, setShowUrlForm] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Save messages to sessionStorage on change (strip non-serializable fields)
  useEffect(() => {
    try {
      const serializable = messages
        .filter(m => m.role !== 'system' || (m.systemType !== 'sub-choices' && m.systemType !== 'action-cards'))
        .map(({ subChoices, ...rest }) => rest);
      sessionStorage.setItem('echome_voice_chat', JSON.stringify(serializable));
    } catch {}
  }, [messages]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, backgroundImport, showUrlForm]);

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
      { id: nextId(), role: 'assistant', content: 'Opening the voice recorder. Speak naturally and I\'ll transcribe it to learn your tone.' },
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
          ? 'Opening email import. Follow the instructions to upload your .mbox file.'
          : choice.id === 'paste'
          ? 'Opening the text editor. Paste your writing sample, email, or social post.'
          : 'Opening the file uploader. Drag and drop your files.',
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

  // ─── URL import (background) ───
  const handleUrlImport = async (platform: string, url: string, isOwnContent: boolean) => {
    setShowUrlForm(null);
    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;

    try {
      const result = await api.kbContent.startSocialImport({
        platform: platform === 'blog' ? 'blog' : platform as 'youtube' | 'instagram',
        url: normalizedUrl,
        knowledgeBaseId,
        useForVoiceMatching: isOwnContent,
      });

      if (!result.success || !result.jobId) throw new Error('Failed to start import');

      const jobId = result.jobId;
      const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

      // Immediately confirm + show next actions (don't block the conversation)
      setMessages(prev => [...prev,
        { id: nextId(), role: 'assistant', content: `Got it. I'm importing your ${platformLabel} content in the background. This usually takes a minute or two. You can keep going while I work on it.` },
        { id: nextId(), role: 'system', content: '', systemType: 'action-cards' },
      ]);

      // Poll silently in the background via banner
      setBackgroundImport({ platform, jobId, status: `Importing ${platformLabel}...` });

      let pollCount = 0;
      let consecutiveErrors = 0;
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.kbContent.getSocialImportStatus(jobId);
          consecutiveErrors = 0;
          if (status.job) {
            setBackgroundImport(prev => prev ? { ...prev, status: `Importing ${platformLabel}...`, count: status.job?.contentCount } : null);

            if (status.job.status === 'completed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setBackgroundImport(null);
              setMessages(prev => [...prev, {
                id: nextId(), role: 'system',
                content: `${platformLabel} import complete. ${status.job!.contentCount || 0} items added to your voice profile.`,
                systemType: 'success',
              }]);
              onImportComplete();
            } else if (status.job.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setBackgroundImport(null);
              setMessages(prev => [...prev, { id: nextId(), role: 'system', content: status.job!.message || 'Import failed. Please check the URL and try again.', systemType: 'error' }]);
            }
          }
          pollCount++;
          if (pollCount > 60) {
            if (pollRef.current) clearInterval(pollRef.current);
            setBackgroundImport(null);
            // Don't show error, it's still running on backend
            setMessages(prev => [...prev, { id: nextId(), role: 'system', content: `${platformLabel} import is still running. You'll see the results in your Sources when it's done.`, systemType: 'success' }]);
          }
        } catch {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) {
            if (pollRef.current) clearInterval(pollRef.current);
            setBackgroundImport(null);
          }
        }
      }, 5000);
    } catch (err) {
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

  // Seed initial messages on first render
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = hasContent
        ? 'Welcome back. You can add more content below, or ask me anything about your writing style.'
        : 'I\'m Echo. I learn how you write, speak, and think, then I use that to generate content in your actual voice. But here\'s the thing: I get better every time you feed me. The voice match on your first piece of content is good. Your tenth will be unrecognizable from something you wrote yourself. Start here:';

      setMessages([
        { id: nextId(), role: 'assistant', content: greeting },
        { id: nextId(), role: 'system', content: '', systemType: 'action-cards' },
      ]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent/40 transition-all duration-300 text-left hover:-translate-y-1 disabled:opacity-50"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent transition-colors duration-300">
          <Share2 className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">Connect my Socials</h3>
        <p className="text-xs text-text-secondary leading-snug mb-1">Your social posts are your voice at its most unfiltered. This is how you naturally talk to your audience.</p>
        <p className="text-[11px] text-text-tertiary mb-4">Import from YouTube or Instagram.</p>
        <div className="mt-auto flex items-center text-accent text-xs font-semibold gap-1">
          Get Started <ArrowRight className="w-3 h-3" />
        </div>
      </button>

      {/* Import Writing */}
      <button
        onClick={handleImportWriting}
        className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent-purple/40 transition-all duration-300 text-left hover:-translate-y-1 disabled:opacity-50"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
        <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mb-4 group-hover:bg-accent-purple transition-colors duration-300">
          <FileText className="w-6 h-6 text-accent-purple group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">Import my Writing</h3>
        <p className="text-xs text-text-secondary leading-snug mb-1">Long-form content shows how you structure ideas, build arguments, and explain what you know. This is the depth behind your voice.</p>
        <p className="text-[11px] text-text-tertiary mb-4">Upload PDFs, articles, blog posts, or emails.</p>
        <div className="mt-auto flex items-center text-accent-purple text-xs font-semibold gap-1">
          Upload Files <ArrowRight className="w-3 h-3" />
        </div>
      </button>

      {/* Record Voice */}
      <button
        onClick={handleRecordVoice}
        className="group relative flex flex-col items-start p-6 rounded-[1.5rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent/40 transition-all duration-300 text-left hover:-translate-y-1 disabled:opacity-50"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem]" />
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent transition-colors duration-300">
          <Mic className="w-6 h-6 text-accent group-hover:text-white transition-colors" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">Record a Voice Note</h3>
        <p className="text-xs text-text-secondary leading-snug mb-1">Nothing captures tone like your actual voice. Cadence, rhythm, word choice. Things that don't come through in text live here.</p>
        <p className="text-[11px] text-text-tertiary mb-4">Just talk. I'll pick it up.</p>
        <div className="mt-auto flex items-center text-accent text-xs font-semibold gap-1">
          Start Talking <ArrowRight className="w-3 h-3" />
        </div>
      </button>
    </div>
  );

  // ─── RENDER: Single conversation view (always) ───
  return (
    <div className="flex flex-col h-full relative">
      {/* Ambient bg */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[120px] -z-10 rounded-full pointer-events-none" />

      {/* Messages */}
      {/* Background import banner */}
      {backgroundImport && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-2">
          <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-xl">
            <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
            <span className="text-xs text-text-secondary">
              {backgroundImport.status}{backgroundImport.count ? ` (${backgroundImport.count} found)` : ''}
            </span>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map(m => (
            <div key={m.id}>
              {m.role === 'system' ? (
                <div className="space-y-3">
                  {m.systemType === 'action-cards' && (
                    <div className="pl-[52px] -mt-2">
                      {m.content && <p className="text-sm text-text-secondary mb-3">{m.content}</p>}
                      {actionCards}
                      {hasContent && (
                        <div className="flex flex-wrap gap-2 mt-3">
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
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-accent/40 hover:bg-accent/5 transition-all text-sm font-medium text-text-primary"
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
          {hasConversation && !loading && (
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
