import ProfileContent from './ProfileContent';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  return <ProfileContent />;
}
