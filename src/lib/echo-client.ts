/**
 * Echo copilot client (v1). Lives outside api-client.ts deliberately:
 * api-client.ts is a protected path (CLAUDE.md); this module consumes its
 * exported axios instance, which already carries JWT sync + interceptors.
 */
import { apiClient } from './api-client';

export type EchoIntent = 'create' | 'ingest' | 'question' | 'command';

export interface EchoClassification {
  intent: EchoIntent;
  confidence: number;
  args: Record<string, string>;
  source: 'llm' | 'heuristic';
  latencyMs: number;
}

export interface EchoContext {
  page?: string;
  itemId?: string;
  hasAttachment?: boolean;
}

export async function classifyEchoInput(
  text: string,
  context?: EchoContext,
): Promise<EchoClassification> {
  const response = await apiClient.post('/echo/classify', { text, context });
  return response.data.data as EchoClassification;
}
