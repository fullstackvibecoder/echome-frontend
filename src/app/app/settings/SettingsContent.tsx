'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { UserProfile, UserProfileUpdate, UsageSummary } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { AppPageHeader } from '@/components/app-page-header';

type SettingsTab = 'profile' | 'account' | 'preferences' | 'billing' | 'referral';
const VALID_TABS: SettingsTab[] = ['profile', 'account', 'preferences', 'billing', 'referral'];

export default function SettingsContent() {
  const { user } = useAuth();
  const { isFreeUser, tier } = useSubscription();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'profile'
  );

  const handleTabChange = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);
  const [resetPasswordSending, setResetPasswordSending] = useState(false);

  // Account deletion / cancellation flow
  type DeleteStep = 'idle' | 'reason' | 'offer' | 'confirm' | 'deleting' | 'done';
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleteDetails, setDeleteDetails] = useState('');
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [offeredCoupon, setOfferedCoupon] = useState<string | null>(null);
  const [couponDescription, setCouponDescription] = useState<string | null>(null);
  const [dataSummary, setDataSummary] = useState<{ knowledgeBaseItems: number; generatedContent: number; files: number } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [avatarDragActive, setAvatarDragActive] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [bio, setBio] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Profile context (custom instructions)
  const [profileRole, setProfileRole] = useState('');
  const [profileTopics, setProfileTopics] = useState('');
  const [profileCta, setProfileCta] = useState('');
  const [profileGuardrails, setProfileGuardrails] = useState('');

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  // Usage/billing state
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Load usage when billing tab is selected
  useEffect(() => {
    if (activeTab === 'billing' && !usage && !usageLoading) {
      loadUsage();
    }
  }, [activeTab]);

  const loadUsage = async () => {
    try {
      setUsageLoading(true);
      const response = await api.stripe.getUsageLimits();
      if (response.success && response.data) {
        setUsage(response.data as UsageSummary);
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
    } finally {
      setUsageLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await api.auth.getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setDisplayName(response.data.display_name || '');
        setFullName(response.data.full_name || '');
        setTwitterHandle(response.data.twitter_handle || '');
        setInstagramHandle(response.data.instagram_handle || '');
        setBio(response.data.bio || '');
        setWebsiteUrl(response.data.website_url || '');
        // Load profile context
        setProfileRole(response.data.profile_role || '');
        setProfileTopics(response.data.profile_topics || '');
        setProfileCta(response.data.profile_cta || '');
        setProfileGuardrails(response.data.profile_guardrails || '');
        // Load preferences
        setEmailNotifications(response.data.email_notifications ?? true);
        setWeeklyDigest(response.data.weekly_digest ?? false);
        setTheme(response.data.theme ?? 'light');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfileError('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true);
      setProfileError(null);
      setProfileSuccess(false);

      const updates: UserProfileUpdate = {
        display_name: displayName || undefined,
        full_name: fullName || undefined,
        twitter_handle: twitterHandle || null,
        instagram_handle: instagramHandle || null,
        bio: bio || null,
        website_url: websiteUrl || null,
        // Profile context
        profile_role: profileRole || null,
        profile_topics: profileTopics || null,
        profile_cta: profileCta || null,
        profile_guardrails: profileGuardrails || null,
      };

      const response = await api.auth.updateProfile(updates);
      if (response.success && response.data) {
        setProfile(response.data);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setProfileError(extractErrorMessage(error, 'Failed to save profile'));
    } finally {
      setProfileSaving(false);
    }
  };

  const uploadProfileImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setProfileError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image must be less than 5MB');
      return;
    }
    try {
      setImageUploading(true);
      setProfileError(null);
      const response = await api.auth.uploadProfileImage(file);
      if (response.success && response.data?.profile_image_url) {
        const imageUrl = response.data.profile_image_url;
        setProfile(prev => prev ? { ...prev, profile_image_url: imageUrl } : null);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      setProfileError(extractErrorMessage(error, 'Failed to upload image'));
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadProfileImage(file);
  };

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAvatarDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadProfileImage(file);
  };

  const handlePreferenceChange = async (key: 'email_notifications' | 'weekly_digest' | 'theme', value: boolean | string) => {
    try {
      setPreferencesSaving(true);

      const updates: Record<string, boolean | string> = { [key]: value };
      const response = await api.auth.updateProfile(updates);

      if (response.success && response.data) {
        // Update local state
        if (key === 'email_notifications') {
          setEmailNotifications(value as boolean);
        } else if (key === 'weekly_digest') {
          setWeeklyDigest(value as boolean);
        } else if (key === 'theme') {
          setTheme(value as 'light' | 'dark' | 'auto');
        }
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
      setProfileError('Failed to save preference');
    } finally {
      setPreferencesSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <AppPageHeader
        title="Settings"
        description="Manage your account and profile"
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-border overflow-x-auto">
        <button
          onClick={() => handleTabChange('profile')}
          className={`px-6 py-3 text-body font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => handleTabChange('account')}
          className={`px-6 py-3 text-body font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
            activeTab === 'account'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Account
        </button>
        <button
          onClick={() => handleTabChange('preferences')}
          className={`px-6 py-3 text-body font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => handleTabChange('billing')}
          className={`px-6 py-3 text-body font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
            activeTab === 'billing'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Billing
        </button>
        <button
          onClick={() => handleTabChange('referral')}
          className={`px-6 py-3 text-body font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
            activeTab === 'referral'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Refer & Earn
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6 stagger-children">
          {/* Profile Info Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-subheading text-xl mb-1">Your Profile</h3>
                <p className="text-small text-text-secondary">
                  This information is used to personalize your generated content and carousels
                </p>
              </div>
              {profileSuccess && (
                <span className="px-3 py-1 bg-success/10 text-success text-sm rounded-lg">
                  Saved!
                </span>
              )}
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Display Name & Full Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-small font-medium text-text-primary mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="How you want to appear on carousels"
                      className="w-full px-4 py-3 border-2 border-border rounded-lg input-glow"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Shown on carousel slides (e.g., &quot;John Smith&quot; or &quot;@TechGuru&quot;)
                    </p>
                  </div>
                  <div>
                    <label className="block text-small font-medium text-text-primary mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your legal name"
                      className="w-full px-4 py-3 border-2 border-border rounded-lg input-glow"
                    />
                  </div>
                </div>

                {/* Social Handles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-small font-medium text-text-primary mb-2">
                      Twitter / X Handle
                    </label>
                    <div className="flex items-center">
                      <span className="px-4 py-3 bg-bg-secondary border-2 border-r-0 border-border rounded-l-lg text-text-secondary">
                        @
                      </span>
                      <input
                        type="text"
                        value={twitterHandle}
                        onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, ''))}
                        placeholder="username"
                        className="flex-1 px-4 py-3 border-2 border-border rounded-r-lg input-glow"
                      />
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      Used for carousel branding and attribution
                    </p>
                  </div>
                  <div>
                    <label className="block text-small font-medium text-text-primary mb-2">
                      Instagram Handle
                    </label>
                    <div className="flex items-center">
                      <span className="px-4 py-3 bg-bg-secondary border-2 border-r-0 border-border rounded-l-lg text-text-secondary">
                        @
                      </span>
                      <input
                        type="text"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ''))}
                        placeholder="username"
                        className="flex-1 px-4 py-3 border-2 border-border rounded-r-lg input-glow"
                      />
                    </div>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-small font-medium text-text-primary mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-3 border-2 border-border rounded-lg input-glow"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-small font-medium text-text-primary mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A short bio about yourself..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 border-2 border-border rounded-lg input-glow resize-none"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    {bio.length}/500 characters
                  </p>
                </div>

                {/* Content Identity Section */}
                <div className="pt-6 border-t border-border">
                  <h4 className="text-subheading text-lg mb-1">Content Identity</h4>
                  <p className="text-small text-text-secondary mb-4">
                    These details help personalize your generated content
                  </p>

                  <div className="space-y-4">
                    {/* What you do */}
                    <div>
                      <label className="block text-small font-medium text-text-primary mb-2">
                        What do you do?
                      </label>
                      <input
                        type="text"
                        value={profileRole}
                        onChange={(e) => setProfileRole(e.target.value)}
                        placeholder="e.g., Leadership coach for mid-career women in tech"
                        maxLength={200}
                        className="w-full px-4 py-3 border-2 border-border rounded-lg input-glow"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        {profileRole.length}/200 characters
                      </p>
                    </div>

                    {/* Topics */}
                    <div>
                      <label className="block text-small font-medium text-text-primary mb-2">
                        What topics do you cover?
                      </label>
                      <input
                        type="text"
                        value={profileTopics}
                        onChange={(e) => setProfileTopics(e.target.value)}
                        placeholder="e.g., Confidence, career transitions, executive presence"
                        maxLength={300}
                        className="w-full px-4 py-3 border-2 border-border rounded-lg input-glow"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        {profileTopics.length}/300 characters
                      </p>
                    </div>

                    {/* CTA/Offer */}
                    <div>
                      <label className="block text-small font-medium text-text-primary mb-2">
                        Your offer or CTA
                      </label>
                      <input
                        type="text"
                        value={profileCta}
                        onChange={(e) => setProfileCta(e.target.value)}
                        placeholder="e.g., Confident Leader OS - my $497 self-paced course"
                        maxLength={200}
                        className="w-full px-4 py-3 border-2 border-border rounded-lg input-glow"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        {profileCta.length}/200 characters
                      </p>
                    </div>

                    {/* Guardrails */}
                    <div>
                      <label className="block text-small font-medium text-text-primary mb-2">
                        Brand guardrails
                      </label>
                      <textarea
                        value={profileGuardrails}
                        onChange={(e) => setProfileGuardrails(e.target.value)}
                        placeholder="e.g., Never say hustle or grind. No bro-marketing. Warm but authoritative."
                        rows={2}
                        maxLength={500}
                        className="w-full px-4 py-3 border-2 border-border rounded-lg input-glow resize-none"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        {profileGuardrails.length}/500 characters
                      </p>
                    </div>
                  </div>
                </div>

                {profileError && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                    <p className="text-sm text-error">{profileError}</p>
                  </div>
                )}

                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {profileSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Profile Image Card */}
          <div
            className={`card transition-all duration-200 ${
              avatarDragActive ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''
            }`}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setAvatarDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setAvatarDragActive(false); }}
            onDrop={handleAvatarDrop}
          >
            <h3 className="text-subheading text-xl mb-4">Profile Image</h3>
            <div className="flex items-center gap-6">
              <div className={`w-24 h-24 rounded-full bg-accent/10 border-2 flex items-center justify-center overflow-hidden transition-colors ${
                avatarDragActive ? 'border-accent' : 'border-accent/20'
              }`}>
                {avatarDragActive ? (
                  <span className="text-2xl">📥</span>
                ) : profile?.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-accent">
                    {displayName?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-body text-text-secondary mb-3">
                  {avatarDragActive
                    ? 'Drop your image to upload'
                    : 'Your profile image appears on carousel slides and content attribution.'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="px-4 py-2 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {imageUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Image'
                  )}
                </button>
                <p className="text-xs text-text-secondary mt-2">
                  Drag & drop or click to upload. Square image, at least 200x200px. Max 5MB.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="card">
            <h3 className="text-subheading text-xl mb-2">Change Password</h3>
            <p className="text-body text-text-secondary mb-4">
              We&apos;ll send a password reset link to your email address.
            </p>
            <button
              onClick={async () => {
                if (!user?.email) return;
                setResetPasswordSending(true);
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                    redirectTo: `${window.location.origin}/auth/reset-password`,
                  });
                  if (error) throw error;
                  toast.success('Password reset email sent! Check your inbox.');
                } catch {
                  toast.error('Failed to send reset email. Please try again.');
                } finally {
                  setResetPasswordSending(false);
                }
              }}
              disabled={resetPasswordSending}
              className="btn-primary"
            >
              {resetPasswordSending ? 'Sending...' : 'Send Reset Email'}
            </button>
          </div>

          {/* Account Deletion / Cancellation */}
          <div className="card border-2 border-error/20">
            <h3 className="text-subheading text-xl mb-2 text-error">Danger Zone</h3>

            {/* Step: Idle — show button */}
            {deleteStep === 'idle' && (
              <>
                <p className="text-body text-text-secondary mb-4">
                  {isFreeUser
                    ? 'Delete your account and all associated data permanently.'
                    : 'Cancel your subscription or delete your account.'}
                </p>
                <button
                  onClick={async () => {
                    setDeleteStep('reason');
                    setDeleteError(null);
                    try {
                      const res = await api.account.getDataSummary();
                      if (res.success && res.data) setDataSummary(res.data);
                    } catch { /* ignore */ }
                  }}
                  className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors"
                >
                  {isFreeUser ? 'Delete Account' : 'Cancel / Delete Account'}
                </button>
              </>
            )}

            {/* Step: Reason — collect feedback */}
            {deleteStep === 'reason' && (
              <div className="space-y-4">
                <p className="text-body text-text-secondary">
                  We&apos;re sorry to see you go. Can you tell us why?
                </p>
                <div className="space-y-2">
                  {[
                    { value: 'too_expensive', label: 'Too expensive' },
                    { value: 'not_using', label: "I'm not using it enough" },
                    { value: 'missing_features', label: 'Missing features I need' },
                    { value: 'switched', label: 'Switched to another tool' },
                    { value: 'other', label: 'Other' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-secondary transition-colors">
                      <input
                        type="radio"
                        name="cancelReason"
                        value={opt.value}
                        checked={deleteReason === opt.value}
                        onChange={() => setDeleteReason(opt.value)}
                        className="w-4 h-4 text-accent"
                      />
                      <span className="text-body">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {(deleteReason === 'other' || deleteReason === 'missing_features') && (
                  <textarea
                    value={deleteDetails}
                    onChange={(e) => setDeleteDetails(e.target.value)}
                    placeholder={deleteReason === 'missing_features' ? 'What features would you like to see?' : 'Tell us more...'}
                    className="w-full p-3 border border-border rounded-lg text-body bg-surface min-h-[80px] resize-none"
                    maxLength={2000}
                  />
                )}
                {deleteError && <p className="text-sm text-error">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setDeleteStep('idle'); setDeleteReason(''); setDeleteDetails(''); setDeleteError(null); }}
                    className="btn-secondary"
                  >
                    Never mind
                  </button>
                  <button
                    disabled={!deleteReason}
                    onClick={async () => {
                      try {
                        setDeleteError(null);
                        const res = await api.account.submitFeedback({
                          reason: deleteReason,
                          details: deleteDetails || undefined,
                          userType: isFreeUser ? 'free' : 'paid',
                          subscriptionTier: isFreeUser ? undefined : tier,
                        });
                        if (res.success && res.data) {
                          setFeedbackId(res.data.feedbackId);
                          setOfferedCoupon(res.data.offeredCoupon);
                          setCouponDescription(res.data.couponDescription);
                          // Paid users with a coupon offer → show offer step
                          // Otherwise → go straight to confirm
                          if (!isFreeUser && res.data.offeredCoupon) {
                            setDeleteStep('offer');
                          } else {
                            setDeleteStep('confirm');
                          }
                        }
                      } catch (err) {
                        setDeleteError(extractErrorMessage(err));
                      }
                    }}
                    className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step: Offer — win-back coupon for paid users */}
            {deleteStep === 'offer' && (
              <div className="space-y-4">
                <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                  <h4 className="text-subheading text-lg mb-2">We&apos;d love you to stay!</h4>
                  <p className="text-body text-text-secondary mb-3">
                    How about <strong>{couponDescription}</strong>? We&apos;ll apply it to your subscription immediately.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        setDeleteError(null);
                        if (feedbackId) {
                          await api.account.applyWinback(feedbackId);
                        }
                        toast.success('Discount applied! Thanks for staying.');
                        setDeleteStep('idle');
                        setDeleteReason('');
                        setDeleteDetails('');
                      } catch (err) {
                        setDeleteError(extractErrorMessage(err));
                      }
                    }}
                    className="btn-primary"
                  >
                    Apply Discount & Stay
                  </button>
                </div>
                {deleteError && <p className="text-sm text-error">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setDeleteStep('idle'); setDeleteReason(''); setDeleteDetails(''); }}
                    className="btn-secondary"
                  >
                    Never mind
                  </button>
                  <button
                    onClick={() => setDeleteStep('confirm')}
                    className="text-sm text-text-secondary underline hover:text-error transition-colors"
                  >
                    No thanks, continue with cancellation
                  </button>
                </div>
              </div>
            )}

            {/* Step: Confirm — show data summary and type DELETE */}
            {deleteStep === 'confirm' && (
              <div className="space-y-4">
                {!isFreeUser && (
                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                    <p className="text-body text-text-secondary">
                      <strong>Cancel subscription only?</strong> You&apos;ll keep access until your current billing period ends. Your data stays safe.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          setDeleteError(null);
                          const res = await api.account.cancelSubscription(feedbackId || undefined);
                          if (res.success && res.data) {
                            setCancelAtPeriodEnd(res.data.cancelAtPeriodEnd);
                            toast.success(
                              res.data.cancelAtPeriodEnd
                                ? `Subscription cancelled. Access continues until ${new Date(res.data.cancelAtPeriodEnd).toLocaleDateString()}.`
                                : 'Subscription cancelled.'
                            );
                            setDeleteStep('idle');
                            setDeleteReason('');
                            setDeleteDetails('');
                          }
                        } catch (err) {
                          setDeleteError(extractErrorMessage(err));
                        }
                      }}
                      className="mt-3 btn-secondary"
                    >
                      Just Cancel Subscription
                    </button>
                  </div>
                )}

                <div className="p-4 bg-error/5 border border-error/20 rounded-lg">
                  <h4 className="text-subheading text-lg mb-2 text-error">Permanent Deletion</h4>
                  <p className="text-body text-text-secondary mb-3">
                    This will permanently delete:
                  </p>
                  <ul className="list-disc list-inside text-body text-text-secondary space-y-1 mb-3">
                    {dataSummary && (
                      <>
                        <li>{dataSummary.knowledgeBaseItems} knowledge base item{dataSummary.knowledgeBaseItems !== 1 ? 's' : ''}</li>
                        <li>{dataSummary.generatedContent} generated content item{dataSummary.generatedContent !== 1 ? 's' : ''}</li>
                        <li>{dataSummary.files} uploaded file{dataSummary.files !== 1 ? 's' : ''}</li>
                      </>
                    )}
                    <li>All voice data and embeddings</li>
                    <li>Your profile and settings</li>
                    {!isFreeUser && <li>Your subscription (cancelled immediately)</li>}
                  </ul>
                  <p className="text-body text-text-secondary mb-3">
                    Type <strong>DELETE</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full p-3 border border-border rounded-lg text-body bg-surface mb-3"
                    autoComplete="off"
                  />
                  {deleteError && <p className="text-sm text-error mb-3">{deleteError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setDeleteStep('idle'); setDeleteReason(''); setDeleteDetails(''); setDeleteConfirmText(''); }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={deleteConfirmText !== 'DELETE'}
                      onClick={async () => {
                        try {
                          setDeleteError(null);
                          setDeleteStep('deleting');
                          await api.account.deleteAccount(feedbackId || undefined);
                          setDeleteStep('done');
                        } catch (err) {
                          setDeleteError(extractErrorMessage(err));
                          setDeleteStep('confirm');
                        }
                      }}
                      className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50"
                    >
                      Delete My Account Forever
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Deleting — spinner */}
            {deleteStep === 'deleting' && (
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-8 h-8 border-3 border-error border-t-transparent rounded-full animate-spin" />
                <p className="text-body text-text-secondary">Deleting your account and all data...</p>
              </div>
            )}

            {/* Step: Done — redirect to home */}
            {deleteStep === 'done' && (
              <div className="flex flex-col items-center py-8 gap-4">
                <p className="text-body text-text-secondary">Your account has been deleted. Redirecting...</p>
                {(() => {
                  // Auto-redirect after showing message
                  setTimeout(() => { window.location.href = '/'; }, 2000);
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-subheading text-xl">Preferences</h3>
            {preferencesSaving && (
              <span className="text-small text-text-secondary flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            )}
          </div>
          <div className="space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-small font-medium text-text-primary mb-3">
                Theme
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePreferenceChange('theme', 'light')}
                  className={`px-4 py-2 border-2 rounded-lg transition-colors ${
                    theme === 'light'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => handlePreferenceChange('theme', 'dark')}
                  className={`px-4 py-2 border-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => handlePreferenceChange('theme', 'auto')}
                  className={`px-4 py-2 border-2 rounded-lg transition-colors ${
                    theme === 'auto'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-secondary hover:border-accent'
                  }`}
                >
                  Auto
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Choose your preferred color theme. Dark mode coming soon.
              </p>
            </div>

            {/* Email Notifications */}
            <div>
              <label className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:border-accent transition-colors cursor-pointer">
                <div>
                  <p className="text-body font-medium">Email Notifications</p>
                  <p className="text-small text-text-secondary">
                    Receive updates when your content is ready
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-accent"
                  checked={emailNotifications}
                  onChange={(e) => handlePreferenceChange('email_notifications', e.target.checked)}
                />
              </label>
            </div>

            {/* Weekly Summary */}
            <div>
              <label className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:border-accent transition-colors cursor-pointer">
                <div>
                  <p className="text-body font-medium">Weekly Summary</p>
                  <p className="text-small text-text-secondary">
                    Get a weekly email digest of your content activity
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-accent"
                  checked={weeklyDigest}
                  onChange={(e) => handlePreferenceChange('weekly_digest', e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="card">
            <h3 className="text-subheading text-xl mb-4">Current Plan</h3>
            {usageLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-display text-2xl font-bold text-accent mb-1">
                      {usage?.tier === 'free' ? 'Free' :
                       usage?.tier === 'pro' ? 'Echo' :
                       usage?.tier === 'studio' ? 'Echo Studio' :
                       usage?.tier === 'enterprise' ? 'Echo Pro' : 'Free'}
                    </p>
                    <p className="text-body text-text-secondary">
                      {usage?.isUnlimited
                        ? 'Unlimited generations'
                        : usage?.tier === 'free'
                        ? '2 free generations (lifetime)'
                        : `${usage?.generationsLimit || 10} generations per month`}
                    </p>
                  </div>
                  {(!usage || usage.tier === 'free') && (
                    <button
                      onClick={() => window.location.href = '/app/billing'}
                      className="btn-primary"
                    >
                      Upgrade to Pro
                    </button>
                  )}
                </div>

                {/* Usage - only show for limited plans */}
                {usage && !usage.isUnlimited && (
                  <div className="p-4 bg-bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-small text-text-secondary">Generations this month</span>
                      <span className="text-small font-semibold">
                        {usage.generationsUsed} / {usage.generationsLimit} used
                      </span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          usage.generationsRemaining === 0 ? 'bg-error' :
                          usage.generationsRemaining <= 2 ? 'bg-warning' : 'bg-accent'
                        }`}
                        style={{
                          width: `${Math.min(100, (usage.generationsUsed / usage.generationsLimit) * 100)}%`
                        }}
                      />
                    </div>
                    {usage.generationsRemaining === 0 && (
                      <p className="text-xs text-error mt-2">
                        You&apos;ve reached your monthly limit. Upgrade for unlimited generations.
                      </p>
                    )}
                  </div>
                )}

                {/* Show unlimited badge for paid plans */}
                {usage?.isUnlimited && (
                  <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-accent text-lg">✓</span>
                      <span className="text-body font-medium text-accent">Unlimited generations</span>
                    </div>
                    <p className="text-small text-text-secondary mt-1">
                      {usage.generationsUsed} generations this month
                    </p>
                  </div>
                )}

                {/* Video minutes usage */}
                {usage && usage.videoMinutesLimit > 0 && (
                  <div className="p-4 bg-bg-secondary rounded-lg mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-small text-text-secondary">Video minutes this month</span>
                      <span className="text-small font-semibold">
                        {usage.videoMinutesUsed.toFixed(1)} / {usage.videoMinutesLimit === -1 ? '∞' : usage.videoMinutesLimit} used
                      </span>
                    </div>
                    {usage.videoMinutesLimit !== -1 && (
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{
                            width: `${Math.min(100, (usage.videoMinutesUsed / usage.videoMinutesLimit) * 100)}%`
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Manage Subscription */}
          {usage && usage.tier !== 'free' && (
            <div className="card">
              <h3 className="text-subheading text-xl mb-4">Manage Subscription</h3>
              <p className="text-body text-text-secondary mb-4">
                View invoices, update payment method, or cancel your subscription.
              </p>
              <button
                onClick={async () => {
                  try {
                    const response = await api.stripe.getPortalUrl();
                    if (response.success && response.data?.url) {
                      window.location.href = response.data.url;
                    }
                  } catch (error) {
                    console.error('Failed to open billing portal:', error);
                  }
                }}
                className="px-4 py-2 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors"
              >
                Open Billing Portal
              </button>
            </div>
          )}

          {/* Invoice History - show for free users */}
          {(!usage || usage.tier === 'free') && (
            <div className="card">
              <h3 className="text-subheading text-xl mb-4">Invoice History</h3>
              <p className="text-body text-text-secondary">No invoices yet</p>
            </div>
          )}
        </div>
      )}

      {/* Referral Tab */}
      {activeTab === 'referral' && (
        <div className="space-y-6">
          {/* Quick Share Card */}
          <div className="card">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/15 to-accent-purple/10 rounded-xl flex items-center justify-center text-2xl">
                🔗
              </div>
              <div className="flex-1">
                <h3 className="text-subheading text-xl mb-1">Your Referral Link</h3>
                <p className="text-body text-text-secondary text-sm">
                  Share this link with anyone. When they sign up and subscribe, you earn 25% recurring.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`https://tryechome.com/?via=${user?.email?.split('@')[0] || 'you'}`}
                className="flex-1 px-4 py-3 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://tryechome.com/?via=${user?.email?.split('@')[0] || 'you'}`);
                  toast.success('Referral link copied!');
                }}
                className="px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>

            <p className="text-xs text-text-secondary mt-3">
              Not an affiliate yet? <a href="https://echo.affonso.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Sign up first</a> to activate tracking and start earning commissions.
            </p>
          </div>

          {/* Refer & Earn Card */}
          <div className="card">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-2xl">
                🎁
              </div>
              <div>
                <h3 className="text-subheading text-xl mb-1">Refer & Earn</h3>
                <p className="text-body text-text-secondary">
                  Love EchoMe? Share it with friends and earn 25% recurring commission on every referral.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-bg-secondary rounded-lg">
                <h4 className="text-body font-semibold mb-2">How it works</h4>
                <ol className="text-small text-text-secondary space-y-2 list-decimal list-inside">
                  <li>Sign up as an affiliate (free, takes 2 minutes)</li>
                  <li>Get your unique referral link</li>
                  <li>Share with friends, followers, or your audience</li>
                  <li>Earn 25% of every subscription they purchase - forever</li>
                </ol>
              </div>

              <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <h4 className="text-body font-semibold text-accent mb-2">Commission Structure</h4>
                <ul className="text-small text-text-secondary space-y-1">
                  <li>• Echo ($29/mo) → <span className="text-accent font-medium">$7.25/mo per referral</span></li>
                  <li>• Echo Studio ($49/mo) → <span className="text-accent font-medium">$12.25/mo per referral</span></li>
                  <li>• Echo Pro ($99/mo) → <span className="text-accent font-medium">$24.75/mo per referral</span></li>
                </ul>
              </div>

              <div className="flex gap-3">
                <a
                  href="https://echo.affonso.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex-1 text-center block"
                >
                  Become an Affiliate
                </a>
                <a
                  href="/affiliates"
                  className="px-4 py-2 border-2 border-border text-text-secondary rounded-lg hover:border-accent hover:text-accent transition-colors text-center flex items-center justify-center"
                >
                  Learn More
                </a>
              </div>

              <p className="text-xs text-text-secondary text-center">
                Already an affiliate? <a href="https://echo.affonso.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Log in to your dashboard</a> to get your link and track earnings.
              </p>
            </div>
          </div>

          {/* Enterprise Referrals */}
          <div className="card">
            <h3 className="text-subheading text-xl mb-4">Know a company that needs EchoMe?</h3>
            <p className="text-body text-text-secondary mb-4">
              Enterprise referrals earn higher commissions. Custom integrations start at $10K with 10-15% commission, plus 25% on the $297/mo managed service.
            </p>
            <a
              href="mailto:partnerships@tryechome.com?subject=Enterprise Referral"
              className="px-4 py-2 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors inline-block"
            >
              Submit Enterprise Referral
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
