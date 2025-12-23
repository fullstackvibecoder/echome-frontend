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
        bg-bg-primary border-2 border-border rounded-lg p-6
        transition-all duration-200
        ${isHovered ? 'shadow-lg -translate-y-1' : 'shadow-md'}
        ${isConnected ? 'border-success/30 bg-success/5' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        {/* Left Side - Platform Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${platform.color}15` }}
            >
              {platform.icon}
            </div>

            {/* Name & Status */}
            <div>
              <h3 className="text-subheading text-lg font-semibold">
                {platform.displayName}
              </h3>
              {isConnected && (
                <div className="flex items-center gap-1 text-success text-small">
                  <span>✓</span>
                  <span>Connected</span>
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
            <div className="mt-3 p-3 bg-bg-secondary rounded-lg">
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
              className="btn-primary cursor-pointer whitespace-nowrap"
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
              className="px-4 py-2 border-2 border-border rounded-lg text-body text-text-secondary hover:border-error hover:text-error transition-colors whitespace-nowrap"
            >
              Disconnect
            </button>
          ) : (
            // Connect button
            <button
              onClick={onConnect}
              className="btn-primary whitespace-nowrap"
              style={{
                backgroundColor: platform.color,
              }}
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
