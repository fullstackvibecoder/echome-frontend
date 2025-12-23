'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

type SettingsTab = 'account' | 'preferences' | 'billing';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display text-4xl mb-2">Settings</h1>
        <p className="text-body text-text-secondary">
          Manage your account preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-border">
        <button
          onClick={() => setActiveTab('account')}
          className={`px-6 py-3 text-body font-medium transition-colors border-b-2 ${
            activeTab === 'account'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-6 py-3 text-body font-medium transition-colors border-b-2 ${
            activeTab === 'preferences'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-6 py-3 text-body font-medium transition-colors border-b-2 ${
            activeTab === 'billing'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Billing
        </button>
      </div>

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
