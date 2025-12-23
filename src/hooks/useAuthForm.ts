'use client';

import { useState } from 'react';
import { z } from 'zod';

// Validation schemas
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;

interface UseAuthFormOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
}

export function useAuthForm<T>({ schema, onSubmit }: UseAuthFormOptions<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setErrors({});
    setGeneralError(null);
    setIsLoading(true);

    try {
      // Convert FormData to object
      const data = Object.fromEntries(formData.entries()) as any;

      // Validate
      const validatedData = schema.parse(data);

      // Submit
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Validation errors
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(fieldErrors);
      } else if (error instanceof Error) {
        // API errors
        setGeneralError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string): {
    strength: 'weak' | 'medium' | 'strong';
    percentage: number;
  } => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    if (/[A-Z]/.test(password)) score += 16;
    if (/[a-z]/.test(password)) score += 16;
    if (/[0-9]/.test(password)) score += 16;
    if (/[^A-Za-z0-9]/.test(password)) score += 2;

    const percentage = Math.min(score, 100);
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    if (percentage >= 75) strength = 'strong';
    else if (percentage >= 50) strength = 'medium';

    return { strength, percentage };
  };

  return {
    errors,
    isLoading,
    generalError,
    handleSubmit,
    getPasswordStrength,
  };
}
