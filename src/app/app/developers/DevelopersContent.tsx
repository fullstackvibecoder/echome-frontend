'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  CreditCard,
  RefreshCw,
  Zap,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { AppPageHeader } from '@/components/app-page-header';

type Tab = 'keys' | 'credits' | 'auto-reload' | 'quickstart';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceInCents: number;
}

interface CreditBalance {
  balance: number;
  lifetime_purchased: number;
  lifetime_used: number;
  auto_reload: {
    enabled: boolean;
    threshold: number | null;
    pack_id: string | null;
    has_payment_method: boolean;
  };
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Transaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string;
  endpoint: string | null;
  credit_pack_id: string | null;
  created_at: string;
}

export default function DevelopersContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('keys');

  // API Keys state
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['generate:read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Credits state
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Auto-reload state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState(10);
  const [autoReloadPackId, setAutoReloadPackId] = useState('starter');
  const [autoReloadPaymentMethodId, setAutoReloadPaymentMethodId] = useState('');
  const [savingAutoReload, setSavingAutoReload] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Handle success redirect from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setActiveTab('credits');
    }
  }, [searchParams]);

  // ==================== Data Loading ====================

  const loadKeys = useCallback(async () => {
    try {
      setKeysLoading(true);
      setError(null); // Clear previous errors
      const res = await api.apiKeys.list();
      if (res.success) {
        setKeys(res.data || []);
      } else {
        throw new Error(res.error?.message || 'Failed to load API keys');
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      setError(`Failed to load API keys: ${errorMessage}`);
      console.error('API Keys load error:', err);
      
      // Set empty array as fallback to prevent UI crashes
      setKeys([]);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  const loadCredits = useCallback(async () => {
    try {
      setCreditsLoading(true);
      setError(null); // Clear previous errors
      
      // Load each endpoint separately to identify specific failures
      const promises = [
        api.apiCredits.getBalance().catch(err => ({ success: false, error: err, endpoint: 'balance' })),
        api.apiCredits.getPacks().catch(err => ({ success: false, error: err, endpoint: 'packs' })),
        api.apiCredits.getTransactions({ limit: 20 }).catch(err => ({ success: false, error: err, endpoint: 'transactions' })),
      ];

      const [balanceRes, packsRes, txRes] = await Promise.allSettled(promises);

      // Handle balance response
      if (balanceRes.status === 'fulfilled' && balanceRes.value.success && balanceRes.value.data) {
        setBalance(balanceRes.value.data);
        setAutoReloadEnabled(balanceRes.value.data.auto_reload.enabled);
        setAutoReloadThreshold(balanceRes.value.data.auto_reload.threshold || 10);
        setAutoReloadPackId(balanceRes.value.data.auto_reload.pack_id || 'starter');
      } else if (balanceRes.status === 'fulfilled' && !balanceRes.value.success) {
        console.error('Balance API error:', balanceRes.value.error);
        setError(`Failed to load credit balance: ${extractErrorMessage(balanceRes.value.error)}`);
        // Set default balance as fallback
        setBalance({
          balance: 0,
          lifetime_purchased: 0,
          lifetime_used: 0,
          auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false },
        });
      } else if (balanceRes.status === 'rejected') {
        console.error('Balance request failed:', balanceRes.reason);
        setError(`Failed to load credit balance: ${extractErrorMessage(balanceRes.reason)}`);
      }

      // Handle packs response
      if (packsRes.status === 'fulfilled' && packsRes.value.success) {
        setPacks(packsRes.value.data || []);
      } else if (packsRes.status === 'fulfilled' && !packsRes.value.success) {
        console.error('Packs API error:', packsRes.value.error);
        if (!error) setError(`Failed to load credit packs: ${extractErrorMessage(packsRes.value.error)}`);
        setPacks([]); // Set empty array as fallback
      } else if (packsRes.status === 'rejected') {
        console.error('Packs request failed:', packsRes.reason);
        if (!error) setError(`Failed to load credit packs: ${extractErrorMessage(packsRes.reason)}`);
        setPacks([]);
      }

      // Handle transactions response
      if (txRes.status === 'fulfilled' && txRes.value.success) {
        setTransactions(txRes.value.data || []);
      } else if (txRes.status === 'fulfilled' && !txRes.value.success) {
        console.error('Transactions API error:', txRes.value.error);
        if (!error) setError(`Failed to load transactions: ${extractErrorMessage(txRes.value.error)}`);
        setTransactions([]); // Set empty array as fallback
      } else if (txRes.status === 'rejected') {
        console.error('Transactions request failed:', txRes.reason);
        if (!error) setError(`Failed to load transactions: ${extractErrorMessage(txRes.reason)}`);
        setTransactions([]);
      }
      
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      setError(`Failed to load credit information: ${errorMessage}`);
      console.error('Credits load error:', err);
      
      // Set fallback data to prevent UI crashes
      setBalance({
        balance: 0,
        lifetime_purchased: 0,
        lifetime_used: 0,
        auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false },
      });
      setPacks([]);
      setTransactions([]);
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const res = await api.apiCredits.getPaymentMethods();
      if (res.success) {
        const methods = res.data || [];
        setPaymentMethods(methods);
        if (methods.length > 0 && !autoReloadPaymentMethodId) {
          setAutoReloadPaymentMethodId(methods[0].id);
        }
      } else {
        console.error('Payment methods API error:', res.error);
        setPaymentMethods([]); // Set empty array as fallback
      }
    } catch (err: any) {
      console.error('Payment methods load error:', err);
      setPaymentMethods([]); // Set empty array as fallback
      // Only show error if it's not a 401/403 (which is expected for users without payment methods)
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        console.warn('Failed to load payment methods:', extractErrorMessage(err));
      }
    }
  }, [autoReloadPaymentMethodId]);

  // Retry function for handling 500 errors
  const retryLoadData = useCallback(async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setError(null);
    
    try {
      await Promise.all([
        loadKeys(),
        loadCredits(), 
        loadPaymentMethods(),
      ]);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Retry failed:', err);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  }, [loadKeys, loadCredits, loadPaymentMethods, isRetrying]);

  useEffect(() => {
    loadKeys();
    loadCredits();
    loadPaymentMethods();
  }, [loadKeys, loadCredits, loadPaymentMethods]);

  // ==================== API Key Actions ====================

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      setCreating(true);
      setError(null);
      const res = await api.apiKeys.create({ name: newKeyName, scopes: newKeyScopes });
      if (res.success && res.data?.key) {
        setCreatedKey(res.data.key);
        loadKeys();
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      setError(null);
      await api.apiKeys.revoke(keyId);
      loadKeys();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // ==================== Credit Actions ====================

  const handlePurchaseCredits = async (packId: string) => {
    try {
      setPurchasing(packId);
      setError(null);
      const res = await api.apiCredits.checkout({
        packId,
        successUrl: `${window.location.origin}/app/developers?success=true`,
        cancelUrl: `${window.location.origin}/app/developers?canceled=true`,
      });
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(extractErrorMessage(err));
      setPurchasing(null);
    }
  };

  // ==================== Auto-Reload Actions ====================

  const handleSaveAutoReload = async () => {
    try {
      setSavingAutoReload(true);
      setError(null);
      await api.apiCredits.updateAutoReload({
        enabled: autoReloadEnabled,
        threshold: autoReloadThreshold,
        packId: autoReloadPackId,
        stripePaymentMethodId: autoReloadPaymentMethodId,
      });
      loadCredits();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingAutoReload(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      setError(null);
      const res = await api.apiCredits.setupPaymentMethod({
        returnUrl: `${window.location.origin}/app/developers?tab=auto-reload`,
      });
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  // ==================== Available Scopes ====================

  const SCOPE_OPTIONS = [
    { value: 'generate:read', label: 'Read generations' },
    { value: 'generate:write', label: 'Create generations' },
    { value: 'generate:*', label: 'Full generation access' },
    { value: 'kb:read', label: 'Read knowledge bases' },
    { value: 'kb:write', label: 'Write knowledge bases' },
    { value: 'kb:*', label: 'Full KB access' },
    { value: 'voice:read', label: 'Read voice profiles' },
    { value: 'voice:write', label: 'Write voice profiles' },
    { value: 'content-kits:read', label: 'Read content kits' },
    { value: '*', label: 'Full access (all scopes)' },
  ];

  // ==================== Tab Button ====================

  const TabButton = ({ tab, label }: { tab: Tab; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
        activeTab === tab
          ? 'border-accent text-accent'
          : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );

  // ==================== Render ====================

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <AppPageHeader
        title="Developers"
        description="Manage API keys, credits, and integrations"
        stats={
          balance ? (
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-accent/10 text-accent">
              {balance.balance.toLocaleString()} credits
            </span>
          ) : null
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-3 text-red-400 mb-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400">
              &times;
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={retryLoadData}
              disabled={isRetrying}
              className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-red-300 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isRetrying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
            {retryCount > 0 && (
              <span className="text-xs text-red-400/60">
                Retry attempt: {retryCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-border overflow-x-auto">
        <TabButton tab="keys" label="API Keys" />
        <TabButton tab="credits" label="Credits" />
        <TabButton tab="auto-reload" label="Auto-Reload" />
        <TabButton tab="quickstart" label="Quick Start" />
      </div>

      {/* ==================== API Keys Tab ==================== */}
      {activeTab === 'keys' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Your API Keys</h2>
            <button
              onClick={() => { setShowCreateModal(true); setCreatedKey(null); setNewKeyName(''); setNewKeyScopes(['generate:read']); }}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Create Key
            </button>
          </div>

          {keysLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent mb-2" />
              <p className="text-sm text-text-secondary">Loading API keys...</p>
            </div>
          ) : keys.length === 0 && !error ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Key className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary mb-4">No API keys yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-accent hover:text-accent/80 text-sm font-medium"
              >
                Create your first key
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`p-4 bg-card rounded-xl border border-border flex items-center justify-between ${
                    key.revoked_at ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Key className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{key.name}</p>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                        <code className="bg-background px-2 py-0.5 rounded">{key.key_prefix}...</code>
                        <span>{key.scopes.join(', ')}</span>
                        {key.last_used_at && (
                          <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.revoked_at ? (
                      <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded">Revoked</span>
                    ) : (
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="p-2 text-text-secondary hover:text-red-400 transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Key Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md mx-4 shadow-xl">
                {createdKey ? (
                  <>
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Key Created</h3>
                    <p className="text-sm text-text-secondary mb-4">
                      Copy this key now — it won&apos;t be shown again.
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border mb-6">
                      <code className="text-sm text-accent flex-1 break-all">{createdKey}</code>
                      <button
                        onClick={() => handleCopyKey(createdKey)}
                        className="p-2 hover:bg-accent/10 rounded-lg transition-colors shrink-0"
                      >
                        {copiedKey ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-text-secondary" />}
                      </button>
                    </div>
                    <button
                      onClick={() => { setShowCreateModal(false); setCreatedKey(null); }}
                      className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Create API Key</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-text-primary mb-1.5 block">Name</label>
                        <input
                          type="text"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., My Integration"
                          className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-primary mb-1.5 block">Scopes</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {SCOPE_OPTIONS.map((scope) => (
                            <label key={scope.value} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newKeyScopes.includes(scope.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewKeyScopes([...newKeyScopes, scope.value]);
                                  } else {
                                    setNewKeyScopes(newKeyScopes.filter((s) => s !== scope.value));
                                  }
                                }}
                                className="rounded border-border"
                              />
                              <span className="text-text-primary">{scope.label}</span>
                              <code className="text-xs text-text-secondary">{scope.value}</code>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 py-2.5 bg-background border border-border rounded-lg hover:bg-border/30 transition-colors text-sm font-medium text-text-primary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateKey}
                        disabled={creating || !newKeyName.trim()}
                        className="flex-1 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== Credits Tab ==================== */}
      {activeTab === 'credits' && (
        <div>
          {creditsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent mb-2" />
              <p className="text-sm text-text-secondary">Loading credit information...</p>
            </div>
          ) : (
            <>
              {/* Balance Cards */}
              {balance ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-6 bg-card rounded-xl border border-border">
                    <p className="text-sm text-text-secondary mb-1">Current Balance</p>
                    <p className="text-3xl font-bold text-accent">{balance.balance?.toLocaleString() || 0}</p>
                    <p className="text-xs text-text-secondary mt-1">credits</p>
                  </div>
                  <div className="p-6 bg-card rounded-xl border border-border">
                    <p className="text-sm text-text-secondary mb-1">Lifetime Purchased</p>
                    <p className="text-2xl font-semibold text-text-primary">{balance.lifetime_purchased?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-6 bg-card rounded-xl border border-border">
                    <p className="text-sm text-text-secondary mb-1">Lifetime Used</p>
                    <p className="text-2xl font-semibold text-text-primary">{balance.lifetime_used?.toLocaleString() || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-xl border border-border p-6 mb-8">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <AlertCircle className="w-5 h-5" />
                    <p>Unable to load credit balance. Please try refreshing the page.</p>
                    <button
                      onClick={retryLoadData}
                      className="ml-auto px-3 py-1 text-xs bg-accent/10 hover:bg-accent/20 text-accent rounded transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Credit Packs */}
              <h3 className="text-lg font-semibold text-text-primary mb-4">Buy Credits</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {packs.map((pack) => (
                  <div key={pack.id} className="p-6 bg-card rounded-xl border border-border hover:border-accent/30 transition-colors">
                    <h4 className="font-semibold text-text-primary text-lg">{pack.name}</h4>
                    <p className="text-3xl font-bold text-text-primary mt-2">
                      ${pack.price}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      {pack.credits} credits
                      <span className="text-text-secondary/60"> &middot; ${(pack.price / pack.credits).toFixed(3)}/credit</span>
                    </p>
                    <button
                      onClick={() => handlePurchaseCredits(pack.id)}
                      disabled={purchasing !== null}
                      className="w-full mt-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {purchasing === pack.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" /> Buy
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Transaction History */}
              <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-text-secondary text-sm py-6 text-center bg-card rounded-xl border border-border">
                  No transactions yet
                </p>
              ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-text-secondary">
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Description</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-3 text-text-secondary">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              tx.type === 'purchase' || tx.type === 'auto_reload' || tx.type === 'admin_grant'
                                ? 'bg-green-500/10 text-green-400'
                                : tx.type === 'usage'
                                ? 'bg-orange-500/10 text-orange-400'
                                : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {tx.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-primary truncate max-w-[200px]">
                            {tx.description}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${
                            tx.amount > 0 ? 'text-green-400' : 'text-orange-400'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </td>
                          <td className="px-4 py-3 text-right text-text-secondary">{tx.balance_after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================== Auto-Reload Tab ==================== */}
      {activeTab === 'auto-reload' && (
        <div className="max-w-lg">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Auto-Reload</h2>
          <p className="text-sm text-text-secondary mb-6">
            Automatically purchase credits when your balance drops below a threshold.
          </p>

          <div className="space-y-6 bg-card p-6 rounded-xl border border-border">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Enable Auto-Reload</label>
              <button
                onClick={() => setAutoReloadEnabled(!autoReloadEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoReloadEnabled ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    autoReloadEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {autoReloadEnabled && (
              <>
                {/* Threshold */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    When balance drops below
                  </label>
                  <input
                    type="number"
                    value={autoReloadThreshold}
                    onChange={(e) => setAutoReloadThreshold(parseInt(e.target.value) || 0)}
                    min={1}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">credits</p>
                </div>

                {/* Pack selector */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    Reload with
                  </label>
                  <select
                    value={autoReloadPackId}
                    onChange={(e) => setAutoReloadPackId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    {packs.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} — {pack.credits} credits (${pack.price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment method */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    Payment Method
                  </label>
                  {paymentMethods.length > 0 ? (
                    <div className="space-y-2">
                      {paymentMethods.map((pm) => (
                        <label key={pm.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={autoReloadPaymentMethodId === pm.id}
                            onChange={() => setAutoReloadPaymentMethodId(pm.id)}
                          />
                          <CreditCard className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm text-text-primary capitalize">{pm.brand}</span>
                          <span className="text-sm text-text-secondary">&middot;&middot;&middot;&middot; {pm.last4}</span>
                          <span className="text-xs text-text-secondary ml-auto">{pm.exp_month}/{pm.exp_year}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary mb-2">No saved payment methods</p>
                  )}
                  <button
                    onClick={handleAddPaymentMethod}
                    className="text-accent hover:text-accent/80 text-sm font-medium mt-2 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add card
                  </button>
                </div>
              </>
            )}

            <button
              onClick={handleSaveAutoReload}
              disabled={savingAutoReload}
              className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingAutoReload ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* ==================== Quick Start Tab ==================== */}
      {activeTab === 'quickstart' && (
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Quick Start</h2>
          <p className="text-sm text-text-secondary mb-6">
            Get started with the EchoMe API in minutes.
          </p>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-text-primary mb-3">1. Get your API key</h3>
              <p className="text-sm text-text-secondary mb-3">
                Create an API key from the API Keys tab. Copy it and keep it safe — it&apos;s only shown once.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-text-primary mb-3">2. Make your first request</h3>
              <p className="text-sm text-text-secondary mb-3">
                Use the <code className="bg-background px-1.5 py-0.5 rounded text-accent text-xs">X-API-Key</code> header to authenticate:
              </p>

              <div className="bg-background rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-text-primary"><code>{`curl -X GET \\
  https://api.tryechome.com/api/generate \\
  -H "X-API-Key: ek_live_your_key_here"`}</code></pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-text-primary mb-3">3. Generate content</h3>
              <p className="text-sm text-text-secondary mb-3">
                Create a new generation (costs 10 credits):
              </p>

              <div className="bg-background rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-text-primary"><code>{`curl -X POST \\
  https://api.tryechome.com/api/generate \\
  -H "X-API-Key: ek_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_type": "text",
    "input_text": "Share 3 tips for better cold emails",
    "output_types": ["social_post"]
  }'`}</code></pre>
              </div>
            </div>

            {/* Credit Costs */}
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-text-primary mb-3">Credit Costs</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="pb-2 text-left font-medium">Endpoint</th>
                    <th className="pb-2 text-right font-medium">Credits</th>
                  </tr>
                </thead>
                <tbody className="text-text-primary">
                  <tr className="border-b border-border/50"><td className="py-2">All GET requests (reads)</td><td className="py-2 text-right text-green-400">Free</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2">POST /api/generate</td><td className="py-2 text-right">10 credits</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2">POST /api/kb, PUT /api/kb/*</td><td className="py-2 text-right">2 credits</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2">POST /api/voice/profile/refresh</td><td className="py-2 text-right">5 credits</td></tr>
                  <tr><td className="py-2">DELETE operations</td><td className="py-2 text-right text-green-400">Free</td></tr>
                </tbody>
              </table>
            </div>

            {/* Link to docs */}
            <a
              href="/docs/API.md"
              target="_blank"
              className="flex items-center gap-2 text-accent hover:text-accent/80 text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" /> Full API Documentation
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
