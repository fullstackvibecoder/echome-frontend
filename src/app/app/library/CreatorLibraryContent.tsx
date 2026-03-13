'use client';

/**
 * Creator Library Page
 *
 * Monthly-refreshed curated B-roll, caption templates, and reel scripts.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api-client';
import type { CuratedAsset, CuratedAssetType } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

const ASSET_TYPE_TABS: { id: CuratedAssetType; label: string }[] = [
  { id: 'b_roll', label: 'B-Roll' },
  { id: 'caption_template', label: 'Caption Templates' },
  { id: 'reel_script', label: 'Reel Scripts' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CreatorLibraryContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const now = new Date();
  const [activeType, setActiveType] = useState<CuratedAssetType>('b_roll');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [assets, setAssets] = useState<CuratedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFreeUser } = useSubscription();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      router.replace('/app');
    }
  }, [authLoading, user, router]);

  // Fetch assets when filters change
  useEffect(() => {
    async function fetchAssets() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.curatedAssets.list({
          type: activeType,
          month: selectedMonth,
          year: selectedYear,
          category: activeCategory !== 'all' ? activeCategory : undefined,
        });
        if (response.success && response.data) {
          setAssets(response.data);
        }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setAssets([]);
        } else {
          setError('Failed to load library');
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssets();
  }, [activeType, selectedMonth, selectedYear, activeCategory]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">This feature is not available yet.</p>
      </div>
    );
  }

  const categories = ['all', ...new Set(assets.map(a => a.category).filter(Boolean))];

  const navigateMonth = (direction: -1 | 1) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const handleCopyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display text-3xl mb-2">Creator Library</h1>
        <p className="text-body text-text-secondary">
          Fresh content drops every month.
        </p>
      </div>

      {/* Tier gate for free users */}
      {isFreeUser && (
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
            <div className="text-center p-8">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Upgrade to access the Creator Library
              </h3>
              <p className="text-text-secondary mb-4">
                Get curated B-roll, caption templates, and reel scripts every month.
              </p>
              <a href="/app/billing" className="btn-primary">
                View Plans
              </a>
            </div>
          </div>
          <div className="filter blur-sm pointer-events-none">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="aspect-[9/16] bg-bg-secondary" />
                  <div className="p-3">
                    <div className="h-4 bg-bg-secondary rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isFreeUser && (
        <>
          {/* Type Tabs */}
          <div className="flex gap-4 mb-6 border-b border-border">
            {ASSET_TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveType(tab.id); setActiveCategory('all'); }}
                className={`pb-3 px-2 text-sm font-medium transition-colors ${
                  activeType === tab.id
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Month Navigation + Category Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateMonth(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
              >
                &#9664;
              </button>
              <span className="text-sm font-medium text-text-primary min-w-[140px] text-center">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
              >
                &#9654;
              </button>
            </div>

            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm border-2 transition-colors ${
                      activeCategory === cat
                        ? 'border-accent bg-accent/5 text-accent'
                        : 'border-border text-text-secondary hover:text-text-primary hover:border-text-secondary'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && assets.length === 0 && (
            <div className="text-center py-16 bg-bg-secondary rounded-xl border border-border">
              <div className="text-4xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-text-primary mb-2">No assets for this month yet</h3>
              <p className="text-text-secondary">Check back soon!</p>
            </div>
          )}

          {/* B-Roll Grid */}
          {!isLoading && activeType === 'b_roll' && assets.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-card rounded-xl border border-border overflow-hidden group">
                  <div className="aspect-[9/16] bg-bg-secondary relative">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-text-tertiary">
                        🎬
                      </div>
                    )}
                    {/* Hover overlay */}
                    {asset.mediaUrl && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={asset.mediaUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                        >
                          Save
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-primary truncate">{asset.title}</p>
                    {asset.category && (
                      <p className="text-xs text-text-secondary mt-1">{asset.category}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Caption Templates */}
          {!isLoading && activeType === 'caption_template' && assets.length > 0 && (
            <div className="space-y-4">
              {assets.map((asset) => (
                <div key={asset.id} className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-text-primary mb-2">{asset.title}</h3>
                      {asset.description && (
                        <p className="text-xs text-text-secondary mb-3">{asset.description}</p>
                      )}
                      {asset.content && (
                        <div className="bg-bg-secondary rounded-lg p-3 text-sm text-text-primary whitespace-pre-wrap">
                          {asset.content}
                        </div>
                      )}
                    </div>
                    {asset.content && (
                      <button
                        onClick={() => handleCopyContent(asset.content!)}
                        className="px-3 py-1.5 text-xs bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors flex-shrink-0"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reel Scripts */}
          {!isLoading && activeType === 'reel_script' && assets.length > 0 && (
            <div className="space-y-4">
              {assets.map((asset) => (
                <ReelScriptCard key={asset.id} asset={asset} onCopy={handleCopyContent} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReelScriptCard({ asset, onCopy }: { asset: CuratedAsset; onCopy: (text: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{asset.title}</h3>
          {asset.description && (
            <p className="text-xs text-text-secondary mt-1">{asset.description}</p>
          )}
          {asset.category && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
              {asset.category}
            </span>
          )}
        </div>
        <span className={`text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </button>
      {isExpanded && asset.content && (
        <div className="px-5 pb-5 border-t border-border pt-4">
          <div className="bg-bg-secondary rounded-lg p-4 text-sm text-text-primary whitespace-pre-wrap mb-3">
            {asset.content}
          </div>
          <button
            onClick={() => onCopy(asset.content!)}
            className="px-4 py-2 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
          >
            Copy Script
          </button>
        </div>
      )}
    </div>
  );
}
