"use client";
import { useState, useEffect } from "react";
import { X, Send, Eye, FlaskConical, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import EmailEditor from "./EmailEditor";
import EmailPreview from "./preview/EmailPreview";
import { GLOBAL_TOKENS } from "./tokens";
import { readDraft, writeDraft, clearDraft } from "./cache/draft-cache";

type Phase = "compose" | "preview" | "confirm" | "sending" | "sent" | "error";

interface Props {
  segment: string;
  adminId: string;
  onClose: () => void;
}

const SIZE_WARN_BYTES = 80 * 1024;

export default function EmailComposeModal({ segment: initialSegment, adminId, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("compose");
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [presets, setPresets] = useState<Array<{ key: string; label: string; recommendedSegment: string }>>([]);
  const [segment, setSegment] = useState(initialSegment);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sizeBytes, setSizeBytes] = useState(0);
  const [preview, setPreview] = useState<{ html: string; recipientCount: number; sample: { email: string; firstName: string; fullName: string | null }; tokenWarnings: string[] } | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSubjectVars, setShowSubjectVars] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.adminEmails.listPresets().then(setPresets).catch(() => setPresets([]));
    const cached = readDraft(adminId);
    if (cached && confirm("Restore previous draft?")) {
      setSubject(cached.subject);
      setBodyHtml(cached.bodyHtml);
      setSegment(cached.segment);
      setPresetKey(cached.presetKey);
    }
  }, [adminId]);

  useEffect(() => {
    if (!dirty) return;
    writeDraft(adminId, { subject, bodyHtml, segment, presetKey });
  }, [subject, bodyHtml, segment, presetKey, dirty, adminId]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const onPresetSelect = async (key: string) => {
    const p = await api.adminEmails.getPreset(key);
    setPresetKey(key);
    setSubject(p.subject);
    setBodyHtml(p.bodyHtml);
    if (p.recommendedSegment && p.recommendedSegment !== segment) {
      setSegment(p.recommendedSegment);
    }
    setDirty(true);
  };

  const onSegmentChange = (newSegment: string) => {
    if (presetKey) {
      const p = presets.find(p => p.key === presetKey);
      if (p && p.recommendedSegment && p.recommendedSegment !== newSegment) {
        if (!confirm(`This preset was designed for "${p.recommendedSegment}". Continue anyway?`)) return;
      }
    }
    setSegment(newSegment);
    setDirty(true);
  };

  const handlePreview = async () => {
    setError(null);
    try {
      const p = await api.adminEmails.preview(segment, subject, bodyHtml);
      setPreview(p);
      setPhase("preview");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || "Preview failed");
      setPhase("error");
    }
  };

  const handleTestSend = async () => {
    setError(null);
    try {
      await api.adminEmails.sendTest(subject, bodyHtml);
      alert("Test email sent to your inbox.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      alert("Test send failed: " + (e?.response?.data?.error || e?.message || "unknown error"));
    }
  };

  const handleConfirmSend = async () => {
    if (!preview) return;
    setPhase("sending");
    try {
      const res = await api.adminEmails.send(segment, subject, bodyHtml, preview.recipientCount);
      setSendResult(res);
      clearDraft(adminId);
      setPhase("sent");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e?.response?.data?.error || e?.message || "Send failed");
      setPhase("error");
    }
  };

  const insertSubjectToken = (key: string) => {
    setSubject(s => s + `{{${key}}}`);
    setShowSubjectVars(false);
    setDirty(true);
  };

  const overSize = sizeBytes > SIZE_WARN_BYTES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Compose Email</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        {phase === "compose" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Starter preset</label>
                <select
                  value={presetKey || ""}
                  onChange={(e) => e.target.value ? onPresetSelect(e.target.value) : setPresetKey(null)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="">Blank</option>
                  {presets.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Segment</label>
                <input
                  type="text"
                  value={segment}
                  onChange={(e) => onSegmentChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setDirty(true); }}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  maxLength={200}
                />
                <div className="relative">
                  <button
                    onClick={() => setShowSubjectVars(!showSubjectVars)}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm hover:bg-muted"
                  >{"{{x}}"}</button>
                  {showSubjectVars && (
                    <div className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-50 border border-border bg-card min-w-[180px]">
                      {GLOBAL_TOKENS.map(t => (
                        <button key={t.key} onClick={() => insertSubjectToken(t.key)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                          <span className="font-mono text-primary">{`{{${t.key}}}`}</span>
                          <span className="ml-2 text-muted-foreground">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Body</label>
              <EmailEditor
                initialContent={bodyHtml}
                onChange={(h) => { setBodyHtml(h); setDirty(true); }}
                onSizeChange={setSizeBytes}
              />
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs ${overSize ? "text-destructive" : "text-muted-foreground"}`}>
                  {(sizeBytes / 1024).toFixed(1)}KB {overSize ? "— Gmail may clip emails over 80KB" : ""}
                </span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t border-border">
              <button
                onClick={handleTestSend}
                disabled={!subject.trim() || !bodyHtml.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-50"
              >
                <FlaskConical size={14} /> Send test to me
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted">Cancel</button>
                <button
                  onClick={handlePreview}
                  disabled={!subject.trim() || !bodyHtml.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Eye size={14} /> Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold">{preview.recipientCount}</span> recipients ·
                Sample: <span className="font-mono">{preview.sample.email}</span>
              </div>
              {preview.tokenWarnings.length > 0 && (
                <span className="text-yellow-600">
                  Tokens using defaults: {preview.tokenWarnings.join(", ")}
                </span>
              )}
            </div>
            <EmailPreview html={preview.html} />
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setPhase("compose")} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted">Back to edit</button>
              <button onClick={() => setPhase("confirm")} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <Send size={14} /> Send
              </button>
            </div>
          </div>
        )}

        {phase === "confirm" && preview && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold">Send to {preview.recipientCount} recipients?</h4>
            <p className="text-sm text-muted-foreground">Sample recipient: <span className="font-mono">{preview.sample.email}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {subject}</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setPhase("preview")} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted">Cancel</button>
              <button onClick={handleConfirmSend} className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm send</button>
            </div>
          </div>
        )}

        {phase === "sending" && (
          <div className="text-center py-12"><Loader2 className="mx-auto animate-spin" /><p className="mt-2 text-sm">Sending...</p></div>
        )}

        {phase === "sent" && sendResult && (
          <div className="text-center py-12 space-y-2">
            <p className="text-lg font-semibold">Sent to {sendResult.sent} recipients</p>
            {sendResult.failed > 0 && <p className="text-destructive">{sendResult.failed} failed</p>}
            <button onClick={onClose} className="mt-4 px-4 py-2 text-sm rounded-lg border border-border">Close</button>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center py-12 space-y-2">
            <p className="text-destructive font-semibold">Error</p>
            <p className="text-sm">{error}</p>
            <button onClick={() => setPhase("compose")} className="mt-4 px-4 py-2 text-sm rounded-lg border border-border">Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
