'use client';

import { useState } from 'react';
import { SocialIntegration } from '@/types';
import { PlatformConfig } from '@/lib/oauth-handlers';

interface IntegrationCardProps {
  platform: PlatformConfig;
  integration?: SocialIntegration;
  onConnect: () => void;
  onDisconnect: () => void;
  onFileUpload?: (file: File) => void;
}

export function IntegrationCard({
  platform,
  integration,
  onConnect,
  onDisconnect,
  onFileUpload,
}: IntegrationCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isConnected = integration?.status === 'connected';
  const isEmail = platform.name === 'email';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        rounded-[1.75rem] border border-outline-variant/40 p-6
        transition-all duration-200
        ${isHovered ? 'shadow-lg -translate-y-1' : 'shadow-md'}
        ${isConnected ? 'border-primary/20 bg-primary/[0.02]' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        {/* Left Side - Platform Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${platform.color}15` }}
            >
              {platform.icon}
            </div>

            {/* Name & Status */}
            <div>
              <h3 className="text-subheading text-lg font-semibold">
                {platform.displayName}
              </h3>
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span>Connected</span>
                </div>
              ) : (
                <div className="text-sm text-slate-lavender">
                  Not connected
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-body text-text-secondary mt-3">
            {platform.description}
          </p>

          {/* Connected Account Info */}
          {isConnected && integration && (
            <div className="mt-3 bg-surface-container-low rounded-2xl p-4">
              <p className="text-small text-text-secondary">
                {integration.accountName && (
                  <span className="font-medium text-text-primary">
                    @{integration.accountName}
                  </span>
                )}
                {integration.postsImported !== undefined && (
                  <span className="ml-2">
                    • {integration.postsImported} posts imported
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Right Side - Action Button */}
        <div className="ml-4">
          {isEmail ? (
            // Email file upload button
            <label
              className="aurora-gradient text-white font-headline font-bold rounded-xl px-4 py-2 cursor-pointer whitespace-nowrap inline-block"
            >
              Upload MBOX
              <input
                type="file"
                accept=".mbox"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : isConnected ? (
            // Disconnect button
            <button
              onClick={onDisconnect}
              className="px-4 py-2 rounded-xl border border-outline-variant/40 text-slate-lavender hover:border-destructive/40 hover:text-destructive transition-colors whitespace-nowrap"
            >
              Disconnect
            </button>
          ) : (
            // Connect button
            <button
              onClick={onConnect}
              className="text-white font-headline font-bold rounded-xl px-4 py-2 whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ backgroundColor: platform.color }}
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
