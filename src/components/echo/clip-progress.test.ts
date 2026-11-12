import { describe, it, expect } from 'vitest';
import { stageFromJob, stageLabel, stepStates, mergePercent, isIndeterminate, formatElapsed } from './clip-progress';

describe('stageFromJob', () => {
  it('maps backend statuses to stages', () => {
    expect(stageFromJob(null)).toBe('queued');
    expect(stageFromJob({ status: 'pending' })).toBe('queued');
    expect(stageFromJob({ status: 'transcribing', currentStep: 'Downloading video...' })).toBe('download');
    expect(stageFromJob({ status: 'transcribing', currentStep: 'Downloading video + transcribing in parallel...' })).toBe('download');
    expect(stageFromJob({ status: 'transcribing', currentStep: 'Analyzing video...' })).toBe('download');
    expect(stageFromJob({ status: 'transcribing', currentStep: 'Transcribing audio...' })).toBe('transcribe');
    expect(stageFromJob({ status: 'transcribing', currentStep: 'Transcription complete' })).toBe('transcribe');
    expect(stageFromJob({ status: 'analyzing' })).toBe('find');
    expect(stageFromJob({ status: 'extracting' })).toBe('cut');
    expect(stageFromJob({ status: 'generating' })).toBe('write');
    expect(stageFromJob({ status: 'completed' })).toBe('done');
    expect(stageFromJob({ status: 'failed' })).toBe('failed');
  });

  it('stays on download while the upload row is still pending', () => {
    expect(stageFromJob({ status: 'transcribing', currentStep: 'Transcribing audio...' }, 'pending')).toBe('download');
    expect(stageFromJob({ status: 'transcribing', currentStep: 'Transcribing audio...' }, 'transcribing')).toBe('transcribe');
    expect(stageFromJob({ status: 'analyzing' }, 'pending')).toBe('find');
    expect(stageFromJob({ status: 'failed' }, 'pending')).toBe('failed');
  });
});

describe('helpers', () => {
  it('labels and steps', () => {
    expect(stageLabel('cut')).toBe('Cutting clips');
    expect(stepStates('find')).toEqual(['done', 'done', 'current', 'pending', 'pending']);
    expect(stepStates('done')).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(stepStates('queued')).toEqual(['pending', 'pending', 'pending', 'pending', 'pending']);
  });
  it('merges percent and decides indeterminate', () => {
    expect(mergePercent(55, 72)).toBe(72);
    expect(mergePercent(undefined, null)).toBe(0);
    expect(mergePercent(150, 0)).toBe(100);
    expect(isIndeterminate('download', 40)).toBe(true);
    expect(isIndeterminate('find', 5)).toBe(true);
    expect(isIndeterminate('find', 40)).toBe(false);
  });
  it('formats elapsed', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65)).toBe('1:05');
    expect(formatElapsed(-3)).toBe('0:00');
  });
});
