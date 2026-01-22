import SettingsContent from './SettingsContent';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return <SettingsContent />;
}
