'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Pencil, Trash2, Star, Loader2, X, Link2, AlertTriangle, Check } from 'lucide-react';
import { api, TeamVoice, TeamVoiceInput } from '@/lib/api-client';
import { KnowledgeBase, SocialIntegration } from '@/types';
import { useVoiceContext } from '@/contexts/voice-context';
import { extractErrorMessage } from '@/lib/error-utils';
import { showErrorToast } from '@/lib/toast';
import { AppPageHeader } from '@/components/app-page-header';

interface VoiceIntegrationAssignment {
  integrationId: string;
  voiceId: string | null;
}

interface VoiceFormData {
  name: string;
  description: string;
  knowledgeBaseId: string;
  profileRole: string;
  profileTopics: string;
  profileCta: string;
  profileGuardrails: string;
  displayName: string;
  twitterHandle: string;
  instagramHandle: string;
  websiteUrl: string;
}

const emptyForm: VoiceFormData = {
  name: '',
  description: '',
  knowledgeBaseId: '',
  profileRole: '',
  profileTopics: '',
  profileCta: '',
  profileGuardrails: '',
  displayName: '',
  twitterHandle: '',
  instagramHandle: '',
  websiteUrl: '',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function TeamVoicesContent() {
  const searchParams = useSearchParams();
  const { voices, isTeamsUser, loading: voiceLoading, refreshVoices, voiceCount, voiceLimit } = useVoiceContext();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Welcome state (persistent via localStorage, dismissible)
  const [showWelcome, setShowWelcome] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingVoice, setEditingVoice] = useState<TeamVoice | null>(null);
  const [formData, setFormData] = useState<VoiceFormData>(emptyForm);

  // Inline KB creation
  const [creatingKb, setCreatingKb] = useState(false);
  const [newKbName, setNewKbName] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Social integration assignments
  const [socialIntegrations, setSocialIntegrations] = useState<SocialIntegration[]>([]);
  const [voiceAssignments, setVoiceAssignments] = useState<VoiceIntegrationAssignment[]>([]);

  // Show welcome banner persistently until dismissed (localStorage)
  // Also set it on first visit from checkout (?welcome=true) to ensure localStorage gets primed
  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      // Mark as not dismissed so it persists
      localStorage.removeItem('echome_teams_welcome_dismissed');
      window.history.replaceState({}, '', '/app/voice?tab=team');
    }
    setShowWelcome(!localStorage.getItem('echome_teams_welcome_dismissed'));
  }, [searchParams]);

  // Load knowledge bases, social integrations, and voice assignments
  useEffect(() => {
    async function loadData() {
      try {
        const [kbResponse, socialResponse, assignmentsResponse] = await Promise.allSettled([
          api.kb.list(),
          api.social.getStatus(),
          api.social.getVoiceAssignments(),
        ]);

        if (kbResponse.status === 'fulfilled' && kbResponse.value.success && kbResponse.value.data) {
          setKnowledgeBases(kbResponse.value.data);
        }
        if (socialResponse.status === 'fulfilled' && socialResponse.value.success && socialResponse.value.data) {
          setSocialIntegrations(socialResponse.value.data.filter((s: SocialIntegration) => s.status === 'active' || s.status === 'connected'));
        }
        if (assignmentsResponse.status === 'fulfilled' && assignmentsResponse.value.success) {
          setVoiceAssignments(assignmentsResponse.value.data);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        showErrorToast(err, 'loading voice data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isAtLimit = voiceLimit > 0 && voiceCount >= voiceLimit;

  const openCreateModal = () => {
    setEditingVoice(null);
    const defaultKb = knowledgeBases.find(kb => kb.is_default) || knowledgeBases[0];
    setFormData({ ...emptyForm, knowledgeBaseId: defaultKb?.id || '' });
    setShowModal(true);
    setError(null);
  };

  const openEditModal = (voice: TeamVoice) => {
    setEditingVoice(voice);
    setFormData({
      name: voice.name,
      description: voice.description || '',
      knowledgeBaseId: voice.knowledgeBaseId || '',
      profileRole: voice.profileRole || '',
      profileTopics: voice.profileTopics || '',
      profileCta: voice.profileCta || '',
      profileGuardrails: voice.profileGuardrails || '',
      displayName: voice.displayName || '',
      twitterHandle: voice.twitterHandle || '',
      instagramHandle: voice.instagramHandle || '',
      websiteUrl: voice.websiteUrl || '',
    });
    setShowModal(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Voice name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const input: TeamVoiceInput = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        knowledgeBaseId: (formData.knowledgeBaseId && formData.knowledgeBaseId !== '__create__') ? formData.knowledgeBaseId : undefined,
        profileRole: formData.profileRole.trim() || undefined,
        profileTopics: formData.profileTopics.trim() || undefined,
        profileCta: formData.profileCta.trim() || undefined,
        profileGuardrails: formData.profileGuardrails.trim() || undefined,
        displayName: formData.displayName.trim() || undefined,
        twitterHandle: formData.twitterHandle.trim() || undefined,
        instagramHandle: formData.instagramHandle.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
      };

      if (editingVoice) {
        await api.teamVoices.update(editingVoice.id, input);
        setSuccessMessage(`"${input.name}" updated successfully`);
      } else {
        await api.teamVoices.create(input);
        setSuccessMessage(`"${input.name}" created successfully`);
      }

      setShowModal(false);
      await refreshVoices();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save voice'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (voiceId: string) => {
    try {
      setError(null);
      await api.teamVoices.delete(voiceId);
      setDeleteConfirm(null);
      setSuccessMessage('Voice deleted');
      await refreshVoices();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete voice'));
      setDeleteConfirm(null);
    }
  };

  const handleSetDefault = async (voiceId: string) => {
    try {
      setError(null);
      await api.teamVoices.setDefault(voiceId);
      setSuccessMessage('Default voice updated');
      await refreshVoices();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to set default voice'));
    }
  };

  // Check if an integration is assigned to a voice
  const isAssignedToVoice = useCallback((integrationId: string, voiceId: string) => {
    return voiceAssignments.some(a => a.integrationId === integrationId && a.voiceId === voiceId);
  }, [voiceAssignments]);

  const isSharedIntegration = useCallback((integrationId: string) => {
    return voiceAssignments.some(a => a.integrationId === integrationId && a.voiceId === null);
  }, [voiceAssignments]);

  const toggleIntegrationAssignment = async (integrationId: string, voiceId: string, assigned: boolean) => {
    try {
      if (assigned) {
        await api.social.assignToVoice(integrationId, voiceId);
        setVoiceAssignments(prev => [...prev, { integrationId, voiceId }]);
      } else {
        await api.social.removeFromVoice(integrationId, voiceId);
        setVoiceAssignments(prev => prev.filter(a => !(a.integrationId === integrationId && a.voiceId === voiceId)));
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update integration assignment'));
    }
  };

  const toggleSharedIntegration = async (integrationId: string, shared: boolean) => {
    try {
      if (shared) {
        await api.social.assignToVoice(integrationId, null);
        setVoiceAssignments(prev => [...prev, { integrationId, voiceId: null }]);
      } else {
        await api.social.removeFromVoice(integrationId, null);
        setVoiceAssignments(prev => prev.filter(a => !(a.integrationId === integrationId && a.voiceId === null)));
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update integration assignment'));
    }
  };

  // Inline KB creation
  const handleCreateKb = async () => {
    if (!newKbName.trim()) return;
    try {
      setCreatingKb(true);
      const response = await api.kb.create(newKbName.trim());
      if (response.success && response.data) {
        const newKb = response.data;
        setKnowledgeBases(prev => [...prev, newKb]);
        setFormData(prev => ({ ...prev, knowledgeBaseId: newKb.id }));
        setNewKbName('');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create knowledge base'));
    } finally {
      setCreatingKb(false);
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!showModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // All conditional renders moved to end to comply with Rules of Hooks
  // This prevents "Rendered fewer hooks than expected" errors
  if (voiceLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in stagger-children">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isTeamsUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎙️</div>
          <h1 className="text-3xl font-bold mb-2">Team Voices</h1>
          <p className="text-muted-foreground mb-6">
            Manage multiple distinct voices from a single account. Perfect for agencies, teams, and multi-brand creators.
          </p>
          <a
            href="/app/billing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Upgrade to EchoTeams
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-in stagger-children">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <AppPageHeader
        title="Team Voices"
        description="Manage multiple voice profiles for your team"
        stats={
          voiceLimit > 0 ? (
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${isAtLimit ? 'text-amber-600 bg-amber-500/10' : 'text-muted-foreground bg-muted'}`}>
              {voiceCount} of {voiceLimit}
            </span>
          ) : undefined
        }
        actions={
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={openCreateModal}
              disabled={isAtLimit}
              className={`btn-primary flex items-center gap-2 ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus className="w-4 h-4" />
              Add Voice
            </button>
            {isAtLimit && (
              <a href="/app/billing" className="text-xs text-amber-600 hover:underline">
                Upgrade for more voices
              </a>
            )}
          </div>
        }
      />

      {/* Welcome Banner (post-checkout) */}
      {showWelcome && (
        <div className="mb-6 p-5 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl relative">
          <button
            onClick={() => {
              localStorage.setItem('echome_teams_welcome_dismissed', new Date().toISOString());
              setShowWelcome(false);
            }}
            className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-lg mb-1">Welcome to EchoTeams!</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Your default voice has been created from your profile. Here&apos;s how to get started:
          </p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li><strong>Edit your default voice</strong> - add a Knowledge Base and profile context</li>
            <li><strong>Create additional voices</strong> - each with their own KB and style</li>
            <li><strong>Switch voices</strong> - use the voice switcher in the sidebar when generating content</li>
          </ol>
        </div>
      )}

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
          {successMessage}
        </div>
      )}
      {error && !showModal && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Voice Grid */}
      {voices.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-xl">
          <div className="text-5xl mb-4">🎙️</div>
          <h3 className="text-lg font-semibold mb-2">No voices yet</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Voices let you manage distinct creator identities - each with their own knowledge base, writing style, and profile context.
          </p>
          <p className="text-sm text-muted-foreground mb-6">Create your first voice to get started.</p>
          <button
            onClick={openCreateModal}
            disabled={isAtLimit}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold transition-colors ${isAtLimit ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'}`}
          >
            <Plus className="w-4 h-4" />
            Create Voice
          </button>
          {isAtLimit && (
            <p className="text-sm text-amber-600 mt-2">
              Voice limit reached. <a href="/app/billing" className="underline hover:no-underline">Upgrade</a> for more.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {voices.map((voice) => {
            const kb = knowledgeBases.find(kb => kb.id === voice.knowledgeBaseId);
            return (
              <div
                key={voice.id}
                className={`relative bg-card border rounded-xl p-5 hover:border-primary/30 transition-all card-lift ${
                  voice.isDefault ? 'ring-2 ring-primary/20' : ''
                }`}
              >
                {voice.isDefault && (
                  <div className="absolute -top-2 right-4 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full uppercase">
                    Default
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent-purple/20 text-primary flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {voice.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{voice.name}</h3>
                    {voice.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{voice.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {kb ? (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          KB: {kb.name || 'Default'}
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          No KB linked
                        </span>
                      )}
                      {voice.profileRole && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full truncate max-w-[200px]">
                          {voice.profileRole}
                        </span>
                      )}
                      {(() => {
                        const assignedCount = voiceAssignments.filter(
                          a => a.voiceId === voice.id || a.voiceId === null
                        ).length;
                        return assignedCount > 0 ? (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {assignedCount} social {assignedCount === 1 ? 'account' : 'accounts'}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {voice.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1.5">Created {timeAgo(voice.createdAt)}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  <button
                    onClick={() => openEditModal(voice)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {!voice.isDefault && (
                    <>
                      <button
                        onClick={() => handleSetDefault(voice.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" />
                        Set Default
                      </button>
                      {deleteConfirm === voice.id ? (
                        <div className="flex flex-col items-end gap-1.5 ml-auto">
                          <p className="text-xs text-muted-foreground">Content created with this voice stays in your library.</p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(voice.id)}
                              className="px-3 py-1.5 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(voice.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <h2 className="text-xl font-bold">
                {editingVoice ? 'Edit Voice' : 'Create Voice'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Voice Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Brand Voice, Creator Name"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this voice"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Knowledge Base */}
              <div>
                <label className="block text-sm font-medium mb-1">Knowledge Base</label>
                <select
                  value={formData.knowledgeBaseId}
                  onChange={(e) => {
                    if (e.target.value === '__create__') {
                      setNewKbName('');
                      setFormData({ ...formData, knowledgeBaseId: '__create__' });
                    } else {
                      setFormData({ ...formData, knowledgeBaseId: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">None (uses account KB)</option>
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>{kb.name || 'Unnamed KB'}</option>
                  ))}
                  <option value="__create__">+ Create new Knowledge Base</option>
                </select>
                {formData.knowledgeBaseId === '__create__' && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newKbName}
                      onChange={(e) => setNewKbName(e.target.value)}
                      placeholder="New KB name"
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateKb()}
                    />
                    <button
                      onClick={handleCreateKb}
                      disabled={creatingKb || !newKbName.trim()}
                      className="px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      {creatingKb ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                    </button>
                  </div>
                )}
                {!formData.knowledgeBaseId && (
                  <p className="text-xs text-amber-600 mt-1">
                    Tip: Your existing knowledge base content is shared across all voices. Assign a specific KB to customize what content this voice draws from.
                  </p>
                )}
              </div>

              {/* Profile Context Section */}
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Profile Context</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Role / Title</label>
                    <input
                      type="text"
                      value={formData.profileRole}
                      onChange={(e) => setFormData({ ...formData, profileRole: e.target.value })}
                      placeholder="e.g., Marketing Director, Tech Influencer"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Topics / Niche</label>
                    <input
                      type="text"
                      value={formData.profileTopics}
                      onChange={(e) => setFormData({ ...formData, profileTopics: e.target.value })}
                      placeholder="e.g., AI, SaaS growth, fitness"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Call-to-Action</label>
                    <input
                      type="text"
                      value={formData.profileCta}
                      onChange={(e) => setFormData({ ...formData, profileCta: e.target.value })}
                      placeholder="e.g., Book a demo, Subscribe to newsletter"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Guardrails</label>
                    <input
                      type="text"
                      value={formData.profileGuardrails}
                      onChange={(e) => setFormData({ ...formData, profileGuardrails: e.target.value })}
                      placeholder="e.g., Never mention competitors, Keep it professional"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              {/* Social Handles Section */}
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Social Handles (for carousel branding)</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="Name shown on content"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Twitter Handle</label>
                      <input
                        type="text"
                        value={formData.twitterHandle}
                        onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value })}
                        placeholder="@handle"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Instagram Handle</label>
                      <input
                        type="text"
                        value={formData.instagramHandle}
                        onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                        placeholder="@handle"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Website</label>
                    <input
                      type="text"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              {/* Social Integrations Section (edit mode only) */}
              {editingVoice && socialIntegrations.length > 0 && (
                <div className="pt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Social Accounts
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose which connected social accounts this voice can use for scheduling and posting.
                  </p>
                  <div className="space-y-2">
                    {socialIntegrations.map((integration) => {
                      const isAssigned = isAssignedToVoice(integration.id, editingVoice.id);
                      const isShared = isSharedIntegration(integration.id);
                      const platformName = integration.platform.charAt(0).toUpperCase() + integration.platform.slice(1);

                      return (
                        <div key={integration.id} className="flex items-center justify-between px-3 py-2 border border-border rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{platformName}</span>
                            {(integration.platform_username || integration.accountName) && (
                              <span className="text-xs text-muted-foreground">
                                @{integration.platform_username || integration.accountName}
                              </span>
                            )}
                            {isShared && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                All voices
                              </span>
                            )}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAssigned || isShared}
                              disabled={isShared}
                              onChange={(e) => toggleIntegrationAssignment(integration.id, editingVoice.id, e.target.checked)}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingVoice ? 'Save Changes' : 'Create Voice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
