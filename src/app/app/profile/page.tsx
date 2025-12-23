'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.profile.update({ name, bio, avatar });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display text-4xl mb-2">Profile</h1>
        <p className="text-body text-text-secondary">
          Manage your personal information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-subheading text-lg mb-4">Preview</h3>
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-accent text-white flex items-center justify-center text-4xl font-bold mx-auto mb-4">
                {name.charAt(0).toUpperCase() || 'U'}
              </div>
              <h4 className="text-subheading text-xl mb-1">{name || 'Your Name'}</h4>
              <p className="text-small text-text-secondary mb-3">{user?.email}</p>
              {bio && (
                <p className="text-body text-text-secondary mt-4 p-3 bg-bg-secondary rounded-lg">
                  {bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="card">
            {/* Success Message */}
            {success && (
              <div className="mb-4 p-4 bg-success/10 border border-success/20 rounded-lg text-success">
                Profile updated successfully!
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="mb-4">
              <label className="block text-small font-medium text-text-primary mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
                placeholder="John Doe"
              />
            </div>

            {/* Email (read-only) */}
            <div className="mb-4">
              <label className="block text-small font-medium text-text-primary mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 border-2 border-border rounded-lg bg-bg-secondary text-text-secondary cursor-not-allowed"
              />
              <p className="text-xs text-text-secondary mt-1">
                Email cannot be changed
              </p>
            </div>

            {/* Bio */}
            <div className="mb-6">
              <label className="block text-small font-medium text-text-primary mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
