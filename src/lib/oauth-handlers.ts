// OAuth and social integration handlers

export interface PlatformConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description: string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  instagram: {
    name: 'instagram',
    displayName: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    description: 'Connect to import your posts and captions',
  },
  youtube: {
    name: 'youtube',
    displayName: 'YouTube',
    icon: '🎥',
    color: '#FF0000',
    description: 'Connect to import your video descriptions and comments',
  },
  linkedin: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    description: 'Connect to import your posts and articles',
  },
  email: {
    name: 'email',
    displayName: 'Email',
    icon: '📧',
    color: '#6366F1',
    description: 'Upload your emails via Google Takeout',
  },
};

export function initiateOAuthFlow(platform: string): void {
  // In production, this would open a popup or redirect to OAuth URL
  // For now, we'll use the backend's /social/connect endpoint
  const width = 600;
  const height = 700;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  const oauthUrl = `${process.env.NEXT_PUBLIC_API_URL}/social/connect/${platform}`;

  const popup = window.open(
    oauthUrl,
    `oauth-${platform}`,
    `width=${width},height=${height},left=${left},top=${top}`
  );

  if (popup) {
    // Listen for OAuth callback
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        // Trigger refresh of integration status
        window.dispatchEvent(new Event('oauth-complete'));
      }
    }, 500);
  }
}

export function handleOAuthCallback(code: string, state: string): void {
  // This would be called from the OAuth callback page
  // Send the code to the backend to exchange for tokens
  console.log('OAuth callback received:', { code, state });
}
