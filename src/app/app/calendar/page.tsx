import CalendarContent from './CalendarContent';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function CalendarPage() {
  return <CalendarContent />;
}
