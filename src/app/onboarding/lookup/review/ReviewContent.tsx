'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Pencil,
  X,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { showErrorToast } from '@/lib/toast';

// ============================================
// CONFIG
// ============================================

interface FieldDef {
  key: string;
  label: string;
  // Render type — 'text' is single-line, 'paragraph' is multi-line, 'list' is array,
  // 'image' is a URL to display.
  type: 'text' | 'paragraph' | 'list' | 'image';
}

// Order matters: we render in this sequence. Anything the backend returns that
// isn't in this list still gets shown via FALLBACK_FIELD_DEF below.
const FIELD_DEFS: FieldDef[] = [
  { key: 'full_name', label: 'Name', type: 'text' },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'topics', label: 'Topics', type: 'list' },
  { key: 'bio', label: 'Bio', type: 'paragraph' },
  { key: 'voice_samples', label: 'Voice samples', type: 'list' },
  { key: 'headshot_url', label: 'Headshot', type: 'image' },
];

const FALLBACK_FIELD_DEF = (key: string): FieldDef => ({
  key,
  label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  type: 'text',
});

// ============================================
// AVATAR
// ============================================

function EchoAvatar() {
  return (
    <div
      className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0"
      style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)' }}
    >
      <Sparkles className="w-5 h-5 text-white" />
    </div>
  );
}

// ============================================
// MAIN
// ============================================

export default function ReviewContent() {
  const router = useRouter();
  const { data: voiceStrength } = useVoiceStrength();

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [profile, setProfile] = useState<{
    fields: Record<string, unknown>;
    field_confidence: Record<string, number>;
    source_trace: Record<string, string>;
  } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');

  // Load the profile (cached on backend after lookup) on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.wbtw.getProfile();
        if (cancelled) return;
        setProfile({
          fields: result.fields ?? {},
          field_confidence: result.field_confidence ?? {},
          source_trace: result.source_trace ?? {},
        });
      } catch (err: unknown) {
        // 404 (flag off / no profile) → graceful fallthrough to /app.
        const status =
          (err as { response?: { status?: number } })?.response?.status ?? 0;
        if (status === 404) {
          router.push('/app');
          return;
        }
        showErrorToast(err, 'loading your profile');
        router.push('/app');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Determine which fields to render — keep declared order, append any extras.
  const renderableFields = useMemo(() => {
    if (!profile) return [];
    const fieldKeys = Object.keys(profile.fields);
    const ordered: FieldDef[] = [];
    const seen = new Set<string>();
    for (const def of FIELD_DEFS) {
      if (fieldKeys.includes(def.key)) {
        ordered.push(def);
        seen.add(def.key);
      }
    }
    for (const key of fieldKeys) {
      if (!seen.has(key)) ordered.push(FALLBACK_FIELD_DEF(key));
    }
    return ordered;
  }, [profile]);

  const handleStartEdit = useCallback(
    (key: string) => {
      if (!profile) return;
      const current = overrides[key] ?? renderValueAsText(profile.fields[key]);
      setEditDraft(current);
      setEditingField(key);
    },
    [profile, overrides]
  );

  const handleSaveEdit = useCallback(() => {
    if (!editingField) return;
    const trimmed = editDraft.trim();
    setOverrides(prev => ({ ...prev, [editingField]: trimmed }));
    setEditingField(null);
    setEditDraft('');
  }, [editingField, editDraft]);

  const handleCancelEdit = useCallback(() => {
    setEditingField(null);
    setEditDraft('');
  }, []);

  const handleClearOverride = useCallback((key: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!profile || confirming) return;
    setConfirming(true);
    try {
      // Accept every field the backend returned. Anything the user edited goes
      // into fields_to_override and replaces the auto-fill (and locks the field).
      const allKeys = Object.keys(profile.fields);
      const overriddenKeys = Object.keys(overrides);
      const acceptedKeys = allKeys.filter(k => !overriddenKeys.includes(k));

      await api.wbtw.confirm({
        fields_to_accept: acceptedKeys,
        fields_to_override: overrides,
      });
      router.push('/app');
    } catch (err) {
      showErrorToast(err, 'saving your profile');
      setConfirming(false);
    }
  }, [profile, overrides, confirming, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  // No profile (rare — lookup screen should have routed away). Fallthrough.
  if (!profile || Object.keys(profile.fields).length === 0) {
    if (typeof window !== 'undefined') router.push('/app');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <span className="text-lg font-bold text-accent">EchoMe</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Echo intro bubble */}
          <div className="flex gap-3 items-start">
            <EchoAvatar />
            <div className="max-w-[85%] bg-white/[0.03] backdrop-blur-xl text-text-primary px-5 py-3.5 rounded-2xl rounded-tl-none border border-white/[0.06] text-sm leading-relaxed">
              Here&apos;s what I have. Tap any line to fix something.
              When it looks right, hit <span className="font-semibold">Looks good</span>{' '}
              and we&apos;ll start.
            </div>
          </div>

          {/* Field cards */}
          <div className="pl-2 sm:pl-[52px] space-y-2">
            {renderableFields.map(def => (
              <FieldRow
                key={def.key}
                def={def}
                value={profile.fields[def.key]}
                confidence={profile.field_confidence[def.key]}
                sourceUrl={profile.source_trace[def.key]}
                override={overrides[def.key]}
                isEditing={editingField === def.key}
                editDraft={editDraft}
                onStartEdit={() => handleStartEdit(def.key)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onChangeDraft={setEditDraft}
                onClearOverride={() => handleClearOverride(def.key)}
              />
            ))}
          </div>

          {/* Voice strength + summary */}
          {voiceStrength && (
            <div className="pl-2 sm:pl-[52px]">
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-text-secondary">
                I read what I could find and started learning your voice.{' '}
                <span className="text-text-primary">
                  Voice strength so far: {voiceStrength.overallStrength}/100
                  {voiceStrength.overallStrength <= 25
                    ? ' (Seed)'
                    : voiceStrength.overallStrength <= 50
                    ? ' (Growing)'
                    : voiceStrength.overallStrength <= 75
                    ? ' (Strong)'
                    : ' (Signature)'}
                  .
                </span>{' '}
                The more you create, the sharper it gets.
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="pl-2 sm:pl-[52px] flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Looks good <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <span className="text-xs text-text-tertiary">
              You can edit or delete any of this later in settings.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FIELD ROW
// ============================================

interface FieldRowProps {
  def: FieldDef;
  value: unknown;
  confidence?: number;
  sourceUrl?: string;
  override?: string;
  isEditing: boolean;
  editDraft: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onChangeDraft: (v: string) => void;
  onClearOverride: () => void;
}

function FieldRow({
  def,
  value,
  confidence,
  sourceUrl,
  override,
  isEditing,
  editDraft,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onChangeDraft,
  onClearOverride,
}: FieldRowProps) {
  const hasOverride = typeof override === 'string';
  const displayValue = hasOverride ? override : value;
  const confident = (confidence ?? 1) >= 0.7;

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        {/* Confidence indicator */}
        <div className="flex-shrink-0 mt-0.5">
          {hasOverride ? (
            <span
              className="inline-flex w-4 h-4 rounded-full bg-accent/15 border border-accent/40 items-center justify-center"
              title="You edited this — it&apos;s now locked from auto-update"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            </span>
          ) : confident ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertTriangle
              className="w-4 h-4 text-amber-500"
              aria-label="Lower confidence — please double-check"
            />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              {def.label}
            </span>
            {hasOverride && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                Edited
              </span>
            )}
          </div>

          {!isEditing ? (
            <FieldDisplay def={def} value={displayValue} />
          ) : (
            <FieldEditor
              def={def}
              draft={editDraft}
              onChange={onChangeDraft}
              onSave={onSaveEdit}
              onCancel={onCancelEdit}
            />
          )}

          {!isEditing && sourceUrl && (
            <p className="mt-1.5 text-[11px] text-text-tertiary truncate">
              From{' '}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {prettySource(sourceUrl)}
              </a>
            </p>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex-shrink-0 flex items-center gap-1">
            {hasOverride && (
              <button
                onClick={onClearOverride}
                title="Revert to what Echo found"
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onStartEdit}
              title="Change this"
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// FIELD DISPLAY / EDITOR
// ============================================

function FieldDisplay({ def, value }: { def: FieldDef; value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-sm text-text-tertiary italic">Not found</span>;
  }
  if (def.type === 'image' && typeof value === 'string') {
    return (
      <div className="mt-1">
        {/* Use plain img — domain isn't whitelisted in next.config images. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Headshot"
          className="w-16 h-16 rounded-full object-cover border border-border"
        />
      </div>
    );
  }
  if (def.type === 'list' && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-0.5">
        {value.map((item, idx) => (
          <span
            key={`${idx}-${String(item).slice(0, 20)}`}
            className="px-2 py-0.5 rounded-full bg-bg-secondary text-xs text-text-primary border border-border"
          >
            {typeof item === 'string' ? item : JSON.stringify(item)}
          </span>
        ))}
      </div>
    );
  }
  if (def.type === 'paragraph') {
    return (
      <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
        {String(value)}
      </p>
    );
  }
  return <p className="text-sm text-text-primary">{String(value)}</p>;
}

function FieldEditor({
  def,
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  def: FieldDef;
  draft: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isMultiline = def.type === 'paragraph' || def.type === 'list';
  return (
    <div className="space-y-2">
      {isMultiline ? (
        <textarea
          value={draft}
          onChange={e => onChange(e.target.value)}
          rows={def.type === 'paragraph' ? 4 : 2}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none"
          autoFocus
          placeholder={
            def.type === 'list'
              ? 'Comma-separated, e.g. Mississauga homes, first-time buyers'
              : 'Type the new version…'
          }
        />
      ) : (
        <input
          type={def.type === 'image' ? 'url' : 'text'}
          value={draft}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
        />
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className="px-3 py-1.5 bg-accent text-white text-xs rounded-lg font-medium hover:bg-accent/90"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function renderValueAsText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(v => String(v)).join(', ');
  return String(value);
}

function prettySource(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

