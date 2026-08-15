import { describe, it, expect } from 'vitest';
import { extractError, extractErrorMessage } from './error-utils';

/**
 * Validation-detail surfacing regressions.
 *
 * The backend emits two validation envelopes and BOTH used to collapse to a
 * bare "Validation failed" in the UI: the nested shape puts raw zod issues
 * at error.details, and the middleware shape puts { field, message } entries
 * at top-level details next to an error OBJECT — so the object branch
 * matched first and the details never rendered. Users saw "Validation
 * failed" with no hint of which field to fix (bio-save churn report).
 */

function axiosErr(status: number, data: unknown) {
  return {
    isAxiosError: true,
    response: { status, data },
  };
}

describe('extractError validation details', () => {
  it('surfaces nested zod issues (error.details with path arrays)', () => {
    const err = axiosErr(400, {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: [
          { path: ['bio'], message: 'String must contain at most 500 character(s)' },
        ],
      },
    });

    const result = extractError(err);
    expect(result.message).toBe(
      'Validation failed: bio: String must contain at most 500 character(s)'
    );
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.status).toBe(400);
  });

  it('surfaces top-level details next to an error object ({ field, message })', () => {
    const err = axiosErr(400, {
      success: false,
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
      details: [{ field: 'website_url', message: 'Invalid url' }],
    });

    expect(extractErrorMessage(err)).toBe('Validation failed: website_url: Invalid url');
  });

  it('falls back to the detail message alone when no field is present', () => {
    const err = axiosErr(400, {
      error: {
        message: 'Validation failed',
        details: [{ message: 'Request body is empty' }],
      },
    });

    expect(extractErrorMessage(err)).toBe('Validation failed: Request body is empty');
  });

  it('leaves plain object errors without details unchanged', () => {
    const err = axiosErr(403, {
      error: { message: 'You don\'t have permission to do that.', code: 'FORBIDDEN' },
    });

    const result = extractError(err);
    expect(result.message).toBe('You don\'t have permission to do that.');
    expect(result.code).toBe('FORBIDDEN');
  });

  it('still handles the legacy flat { error: "msg", details: [...] } shape', () => {
    const err = axiosErr(400, {
      error: 'Validation failed',
      details: [{ message: 'topic is required' }],
    });

    expect(extractErrorMessage(err)).toBe('Validation failed: topic is required');
  });
});
