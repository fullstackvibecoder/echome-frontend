'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import { UserProfile, UserProfileUpdate } from '@/types';

type SettingsTab = 'profile' | 'account' | 'preferences' | 'billing';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [bio, setBio] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

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
      };

      const response = await api.auth.updateProfile(updates);
      if (response.success && response.data) {
        setProfile(response.data);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      setProfileError(error.response?.data?.error?.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display text-4xl mb-2">Settings</h1>
        <p className="text-body text-text-secondary">
          Manage your account and profile
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 text-body font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`px-6 py-3 text-body font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'account'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-6 py-3 text-body font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-6 py-3 text-body font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'billing'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Billing
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
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
                      className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
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
                      className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
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
                        className="flex-1 px-4 py-3 border-2 border-border rounded-r-lg focus:outline-none focus:border-accent transition-colors"
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
                        className="flex-1 px-4 py-3 border-2 border-border rounded-r-lg focus:outline-none focus:border-accent transition-colors"
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
                    className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
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
                    className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    {bio.length}/500 characters
                  </p>
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
          <div className="card">
            <h3 className="text-subheading text-xl mb-4">Profile Image</h3>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center overflow-hidden">
                {profile?.profile_image_url ? (
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
                  Your profile image appears on carousel slides and content attribution.
                </p>
                <button className="px-4 py-2 border-2 border-accent text-accent rounded-lg hover:bg-accent/5 transition-colors">
                  Upload Image
                </button>
                <p className="text-xs text-text-secondary mt-2">
                  Recommended: Square image, at least 200x200px
                </p>
              </div>
            </div>
          </div>

          {/* Social Connections Card */}
          <div className="card">
            <h3 className="text-subheading text-xl mb-2">Social Connections</h3>
            <p className="text-small text-text-secondary mb-4">
              Connect your social accounts for automatic content importing
            </p>

            <div className="space-y-3">
              {/* Instagram */}
              <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📸</span>
                  <div>
                    <p className="font-medium">Instagram</p>
                    <p className="text-sm text-text-secondary">Import posts and captions</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-warning/10 text-warning text-sm rounded-lg">
                  Requires App Review
                </span>
              </div>

              {/* Facebook */}
              <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📘</span>
                  <div>
                    <p className="font-medium">Facebook</p>
                    <p className="text-sm text-text-secondary">Import posts from your page</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-warning/10 text-warning text-sm rounded-lg">
                  Requires App Review
                </span>
              </div>

              {/* YouTube - Already available */}
              <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎬</span>
                  <div>
                    <p className="font-medium">YouTube</p>
                    <p className="text-sm text-text-secondary">Import video transcripts</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-success/10 text-success text-sm rounded-lg">
                  Available via URL
                </span>
              </div>
            </div>

            <p className="text-xs text-text-secondary mt-4">
              Instagram and Facebook connections require Meta app review approval.
              For now, you can manually import content via the Knowledge Base.
            </p>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="card">
            <h3 className="text-subheading text-xl mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-small font-medium text-text-primary mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-small font-medium text-text-primary mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-small font-medium text-text-primary mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <button className="btn-primary">Update Password</button>
            </div>
          </div>

          {/* Delete Account */}
          <div className="card border-2 border-error/20">
            <h3 className="text-subheading text-xl mb-2 text-error">Danger Zone</h3>
            <p className="text-body text-text-secondary mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="card">
          <h3 className="text-subheading text-xl mb-6">Preferences</h3>
          <div className="space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-small font-medium text-text-primary mb-3">
                Theme
              </label>
              <div className="flex gap-3">
                <button className="px-4 py-2 border-2 border-accent bg-accent/10 text-accent rounded-lg">
                  Light
                </button>
                <button className="px-4 py-2 border-2 border-border rounded-lg text-text-secondary hover:border-accent transition-colors">
                  Dark
                </button>
                <button className="px-4 py-2 border-2 border-border rounded-lg text-text-secondary hover:border-accent transition-colors">
                  Auto
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <label className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:border-accent transition-colors cursor-pointer">
                <div>
                  <p className="text-body font-medium">Email Notifications</p>
                  <p className="text-small text-text-secondary">
                    Receive updates about your generations
                  </p>
                </div>
                <input type="checkbox" className="w-5 h-5" defaultChecked />
              </label>
            </div>

            <div>
              <label className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:border-accent transition-colors cursor-pointer">
                <div>
                  <p className="text-body font-medium">Weekly Summary</p>
                  <p className="text-small text-text-secondary">
                    Get a weekly report of your content
                  </p>
                </div>
                <input type="checkbox" className="w-5 h-5" />
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-display text-2xl font-bold text-accent mb-1">
                  {user?.subscription === 'free' ? 'Free' : 'Pro'}
                </p>
                <p className="text-body text-text-secondary">
                  {user?.subscription === 'free'
                    ? '10 generations per month'
                    : 'Unlimited generations'}
                </p>
              </div>
              {user?.subscription === 'free' && (
                <button className="btn-primary">Upgrade to Pro</button>
              )}
            </div>

            {/* Usage */}
            <div className="p-4 bg-bg-secondary rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-small text-text-secondary">This month</span>
                <span className="text-small font-semibold">7 / 10 used</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: '70%' }} />
              </div>
            </div>
          </div>

          {/* Invoice History */}
          <div className="card">
            <h3 className="text-subheading text-xl mb-4">Invoice History</h3>
            <p className="text-body text-text-secondary">No invoices yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
