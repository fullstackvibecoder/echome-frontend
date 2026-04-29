import VoiceTabs from './VoiceTabs';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function VoicePage() {
  return <VoiceTabs />;
}
