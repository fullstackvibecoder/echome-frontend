'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import EmailEditor from '@/components/email-editor/EmailEditor';

interface Step {
  step_number: number;
  day_offset: number;
  subject: string;
  subject_alt?: string;
  preview_text?: string;
  segment_filter?: string;
  body_html?: string;
}

interface Props {
  campaignId: string;
  step: Step;
  onSaved: (updatedSteps: Step[]) => void;
  onDeleted: (updatedSteps: Step[]) => void;
  onCancel: () => void;
}

const SEGMENT_OPTIONS = [
  { value: 'all', label: 'All enrolled users' },
  { value: 'all_except_paid', label: 'All except paid users' },
  { value: 'never_generated', label: '0 generations' },
  { value: 'tried_once', label: 'Exactly 1 generation' },
  { value: 'hit_wall', label: '2+ generations' },
];

export default function StepEditor({ campaignId, step, onSaved, onDeleted, onCancel }: Props) {
  const [subject, setSubject] = useState(step.subject);
  const [subjectAlt, setSubjectAlt] = useState(step.subject_alt || '');
  const [previewText, setPreviewText] = useState(step.preview_text || '');
  const [dayOffset, setDayOffset] = useState<number>(step.day_offset);
  const [segmentFilter, setSegmentFilter] = useState(step.segment_filter || 'all');
  const [bodyHtml, setBodyHtml] = useState(step.body_html || '');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const markDirty = () => {
    setDirty(true);
    setInfo(null);
    setError(null);
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await api.adminCampaigns.updateStep(campaignId, step.step_number, {
        subject,
        subject_alt: subjectAlt || undefined,
        preview_text: previewText || undefined,
        day_offset: dayOffset,
        segment_filter: segmentFilter,
        body_html: bodyHtml,
      });
      if (!res.success) {
        setError(res.error || 'Save failed');
        return false;
      }
      onSaved(res.data.steps);
      setDirty(false);
      setInfo('Saved.');
      return true;
    } catch (e: any) {
      setError(e?.message || 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setError(null);
    setInfo(null);
    try {
      // If unsaved changes, save first so the test reflects what's in the DB
      if (dirty) {
        const ok = await handleSave();
        if (!ok) return;
      }
      const res = await api.adminCampaigns.sendStepTest(campaignId, step.step_number);
      if (!res.success) {
        setError(res.error || 'Send-test failed');
        return;
      }
      setInfo(`Test sent (${res.data?.sent ?? 0} delivered).`);
    } catch (e: any) {
      setError(e?.message || 'Send-test failed');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete step ${step.step_number}? Remaining steps will be renumbered.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await api.adminCampaigns.deleteStep(campaignId, step.step_number);
      if (!res.success) {
        setError(res.error || 'Delete failed');
        return;
      }
      onDeleted(res.data.steps);
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => { setSubject(e.target.value); markDirty(); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">A/B alt subject (optional)</label>
          <input
            type="text"
            value={subjectAlt}
            onChange={(e) => { setSubjectAlt(e.target.value); markDirty(); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Preview text</label>
          <input
            type="text"
            value={previewText}
            onChange={(e) => { setPreviewText(e.target.value); markDirty(); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="What recipients see in the inbox before opening"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Day offset (days after enrollment)</label>
          <input
            type="number"
            min={0}
            value={dayOffset}
            onChange={(e) => { setDayOffset(parseInt(e.target.value) || 0); markDirty(); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Segment filter</label>
          <select
            value={segmentFilter}
            onChange={(e) => { setSegmentFilter(e.target.value); markDirty(); }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {SEGMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">Body</label>
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <EmailEditor
            initialContent={bodyHtml}
            onChange={(html) => { setBodyHtml(html); markDirty(); }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Editor output is sanitized server-side. Allowed tags: p, br, hr, h1-h3, strong, em, u, s, code, ul/ol/li, blockquote, a, img, span (with data-token).
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {info && <p className="text-sm text-emerald-600">{info}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
        <button
          onClick={handleSendTest}
          disabled={sendingTest || saving}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
        >
          {sendingTest ? 'Sending…' : 'Send test to me'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto px-3 py-1.5 text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete step'}
        </button>
      </div>
    </div>
  );
}
