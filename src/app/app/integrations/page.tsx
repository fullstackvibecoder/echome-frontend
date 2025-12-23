'use client';

import { useSocialIntegration } from '@/hooks/useSocialIntegration';
import { PLATFORMS, initiateOAuthFlow } from '@/lib/oauth-handlers';

export default function IntegrationsPage() {
  const { integrations, loading, disconnect } = useSocialIntegration();

  const handleConnect = (platform: string) => {
    if (platform === 'email') return;
    initiateOAuthFlow(platform);
  };

  const handleDisconnect = async (platform: string) => {
    if (confirm(`Are you sure you want to disconnect ${platform}?`)) {
      await disconnect(platform);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display text-4xl mb-2">Integrations</h1>
        <p className="text-body text-text-secondary">
          Connect your social accounts to train your Echo
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Integration Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(PLATFORMS)
            .filter((p) => p.name !== 'email')
            .map((platform) => {
              const integration = integrations.find((i) => i.platform === platform.name);
              const isConnected = integration?.status === 'connected';

              return (
                <div
                  key={platform.name}
                  className={`card border-2 transition-all ${
                    isConnected
                      ? 'border-success/30 bg-success/5'
                      : 'border-border hover:border-accent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${platform.color}15` }}
                      >
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className="text-subheading text-lg font-semibold">
                          {platform.displayName}
                        </h3>
                        {isConnected && (
                          <div className="flex items-center gap-1 text-success text-small mt-1">
                            <span>✓</span>
                            <span>Connected</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-body text-text-secondary mb-4">
                    {platform.description}
                  </p>

                  {/* Connected Info */}
                  {isConnected && integration && (
                    <div className="mb-4 p-3 bg-bg-secondary rounded-lg">
                      {integration.accountName && (
                        <p className="text-small mb-1">
                          <span className="text-text-secondary">Account: </span>
                          <span className="font-medium">@{integration.accountName}</span>
                        </p>
                      )}
                      {integration.postsImported !== undefined && (
                        <p className="text-small mb-1">
                          <span className="text-text-secondary">Posts imported: </span>
                          <span className="font-medium">{integration.postsImported}</span>
                        </p>
                      )}
                      {integration.lastSynced && (
                        <p className="text-small text-text-secondary">
                          Last synced: {new Date(integration.lastSynced).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleConnect(platform.name)}
                          className="flex-1 px-4 py-2 border-2 border-border rounded-lg text-body hover:border-accent transition-colors"
                        >
                          Re-sync
                        </button>
                        <button
                          onClick={() => handleDisconnect(platform.name)}
                          className="flex-1 px-4 py-2 border-2 border-error/30 text-error rounded-lg hover:bg-error/10 transition-colors"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.name)}
                        className="w-full btn-primary"
                        style={{ backgroundColor: platform.color }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
