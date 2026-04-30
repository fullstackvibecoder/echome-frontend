/**
 * Funnel telemetry helper.
 *
 * Fire-and-forget: every call to track() returns immediately. Failures
 * are silent — telemetry should never break a UI flow. The backend
 * also writes async (202 then insert), so this is doubly non-blocking.
 *
 * Event-naming convention: `surface.event_verb` (e.g. paywall.wall_shown,
 * paywall.plan_clicked). Keep payloads small; this isn't a logging
 * pipeline.
 */
import { api } from './api-client';

export function track(eventName: string, eventData?: Record<string, unknown>): void {
  // Don't await. Don't block. Don't surface errors.
  api.telemetry
    .event({ event_name: eventName, event_data: eventData ?? {} })
    .catch(() => {
      // Silent. If telemetry write fails, the user's experience is
      // unaffected; we just lose one event.
    });
}
