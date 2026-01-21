/**
 * SubscriptionGuard Component
 * Protects routes/content based on subscription status
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  /** Require any active subscription (default behavior) */
  requireSubscription?: boolean;
  /** Require specific tier or higher */
  requiredTier?: SubscriptionTier;
  /** Custom fallback while loading */
  loadingFallback?: React.ReactNode;
  /** Custom redirect path (default: /app/billing?upgrade=true) */
  redirectTo?: string;
}

/**
 * Wrap content that requires subscription access
 *
 * @example
 * // Require any subscription
 * <SubscriptionGuard>
 *   <ProtectedContent />
 * </SubscriptionGuard>
 *
 * @example
 * // Require Studio tier or higher
 * <SubscriptionGuard requiredTier="studio">
 *   <StudioFeature />
 * </SubscriptionGuard>
 */
export function SubscriptionGuard({
  children,
  requireSubscription: requireSub = true,
  requiredTier,
  loadingFallback,
  redirectTo = '/app/billing?upgrade=true',
}: SubscriptionGuardProps) {
  const router = useRouter();
  const { loading, isSubscribed, isTrial, hasTierAccess } = useSubscription();

  useEffect(() => {
    if (loading) return;

    // Check basic subscription requirement
    if (requireSub && !isSubscribed && !isTrial) {
      router.push(redirectTo);
      return;
    }

    // Check tier requirement if specified
    if (requiredTier && !hasTierAccess(requiredTier)) {
      const tierNames: Record<SubscriptionTier, string> = {
        free: 'Free',
        pro: 'Echo',
        studio: 'Echo Studio',
        enterprise: 'Echo Pro',
      };
      router.push(`${redirectTo}&tier=${requiredTier}&tierName=${encodeURIComponent(tierNames[requiredTier])}`);
    }
  }, [loading, isSubscribed, isTrial, hasTierAccess, requiredTier, requireSub, redirectTo, router]);

  // Show loading state
  if (loading) {
    return loadingFallback || (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check access
  if (requireSub && !isSubscribed && !isTrial) {
    return null; // Will redirect
  }

  if (requiredTier && !hasTierAccess(requiredTier)) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

/**
 * Higher-order component for subscription protection
 */
export function withSubscription<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<SubscriptionGuardProps, 'children'>
) {
  return function WithSubscriptionComponent(props: P) {
    return (
      <SubscriptionGuard {...options}>
        <WrappedComponent {...props} />
      </SubscriptionGuard>
    );
  };
}
