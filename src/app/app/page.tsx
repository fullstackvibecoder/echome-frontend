import AppContent from './AppContent';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function AppDashboard() {
  return <AppContent />;
}
