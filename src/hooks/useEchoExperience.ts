'use client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Single gate for the Echo experience (Pass 2c). Controls the Home hero, the
 * Voice-page rebuild, intake retirement, and the docked pill. Today it returns
 * admin-only; flipping Echo on for everyone is a one-line change here (e.g.
 * return true, or read a server flag) once soak data validates the classifier.
 */
export function useEchoExperience(): boolean {
  const { user } = useAuth();
  return !!user?.isAdmin;
}
