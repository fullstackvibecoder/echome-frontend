'use client';

import { useRouter } from 'next/navigation';
import { useSocialIntegration } from '@/hooks/useSocialIntegration';
import { IntegrationCard } from '@/components/integration-card';
import { PLATFORMS, initiateOAuthFlow } from '@/lib/oauth-handlers';
import { api } from '@/lib/api-client';

export default function OnboardingStep2Page() {
  const router = useRouter();
  const { integrations, loading, connect, disconnect } = useSocialIntegration();

  const handleConnect = async (platform: string) => {
    if (platform === 'email') {
      return; // Email uses file upload instead
    }

    try {
      initiateOAuthFlow(platform);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      await disconnect(platform);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleEmailUpload = async (file: File) => {
    try {
      // Upload MBOX file
      await api.files.upload('default', file);
      // Refresh integration status
      // In production, the backend would process the MBOX and update status
    } catch (error) {
      console.error('Failed to upload email file:', error);
    }
  };

  const handleNext = () => {
    router.push('/onboarding/step-3');
  };

  const handleSkip = () => {
    router.push('/onboarding/step-3');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-primary to-bg-secondary">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <h1 className="text-2xl font-display font-bold text-accent">EchoMe</h1>
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-8 right-8 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-success text-white flex items-center justify-center text-sm">
          ✓
        </div>
        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
          2
        </div>
        <div className="w-8 h-8 rounded-full bg-border text-text-secondary flex items-center justify-center text-sm">
          3
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-display text-4xl md:text-5xl mb-4">
              Connect Your Voice
            </h1>
            <p className="text-body text-xl text-text-secondary mb-2">
              Learn how you write across platforms (optional)
            </p>
            <p className="text-body text-text-secondary">
              This helps us sound more like you
            </p>
          </div>

          {/* Integration Cards */}
          <div className="space-y-4 mb-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              Object.values(PLATFORMS).map((platform) => {
                const integration = integrations.find(
                  (i) => i.platform === platform.name
                );

                return (
                  <div key={platform.name} className="animate-slide-in">
                    <IntegrationCard
                      platform={platform}
                      integration={integration}
                      onConnect={() => handleConnect(platform.name)}
                      onDisconnect={() => handleDisconnect(platform.name)}
                      onFileUpload={
                        platform.name === 'email'
                          ? handleEmailUpload
                          : undefined
                      }
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Info Box */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-8">
            <p className="text-small text-accent text-center">
              💡 You can always connect more platforms later from Settings
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-body text-text-secondary hover:text-text-primary transition-colors"
            >
              Skip for now
            </button>

            <button onClick={handleNext} className="btn-primary">
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
