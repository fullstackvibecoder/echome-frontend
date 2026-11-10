import { describe, it, expect } from 'vitest';
import {
  getFailedUploadActions,
  getFailedUploadMessage,
  FAILED_UPLOAD_FALLBACK_MESSAGE,
  FAILED_UPLOAD_ACTION_LABELS,
} from './failed-upload-actions';

describe('getFailedUploadActions', () => {
  it('offers only Upload again when the file never fully arrived', () => {
    expect(getFailedUploadActions({ errorCode: 'upload_incomplete', sourceType: 'upload' })).toEqual(['upload_again']);
    expect(getFailedUploadActions({ errorCode: 'upload_aborted', sourceType: 'upload' })).toEqual(['upload_again']);
  });

  it('never offers Try again for an incomplete upload, even from a link source', () => {
    expect(getFailedUploadActions({ errorCode: 'upload_incomplete', sourceType: 'youtube' })).not.toContain('try_again');
  });

  it('routes zoom passcode errors to the passcode prompt', () => {
    expect(getFailedUploadActions({ errorCode: 'zoom_password_required', sourceType: 'zoom' })).toEqual(['enter_passcode']);
    expect(getFailedUploadActions({ errorCode: 'zoom_password_incorrect', sourceType: 'zoom' })).toEqual(['enter_passcode']);
  });

  it('offers only Upload the file instead for a bad link', () => {
    expect(getFailedUploadActions({ errorCode: 'video_url_invalid', sourceType: 'url' })).toEqual(['upload_file']);
  });

  it('offers Try again plus Upload the file instead for any link source', () => {
    for (const sourceType of ['youtube', 'instagram', 'url', 'loom', 'zoom']) {
      expect(getFailedUploadActions({ errorCode: 'download_failed', sourceType })).toEqual(['try_again', 'upload_file']);
    }
  });

  it('offers Try again for file uploads and recordings with any other code', () => {
    expect(getFailedUploadActions({ errorCode: 'processing_failed', sourceType: 'upload' })).toEqual(['try_again']);
    expect(getFailedUploadActions({ errorCode: null, sourceType: 'recording' })).toEqual(['try_again']);
    expect(getFailedUploadActions({})).toEqual(['try_again']);
  });

  it('uses plain labels with no vendor names or em dashes', () => {
    for (const label of [...Object.values(FAILED_UPLOAD_ACTION_LABELS), FAILED_UPLOAD_FALLBACK_MESSAGE]) {
      expect(label).not.toMatch(/—/);
      expect(label).not.toMatch(/rapidapi|apify|yt-dlp|ffmpeg|r2|mux|deepgram|proxy/i);
    }
  });
});

describe('getFailedUploadMessage', () => {
  it('shows the backend message as is', () => {
    expect(getFailedUploadMessage('That video is private.')).toBe('That video is private.');
  });
  it('falls back when the message is missing or blank', () => {
    expect(getFailedUploadMessage(undefined)).toBe('This video did not finish.');
    expect(getFailedUploadMessage('   ')).toBe('This video did not finish.');
  });
});
