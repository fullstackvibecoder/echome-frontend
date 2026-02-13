import { redirect } from 'next/navigation';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function ReelEditorPage() {
  redirect('/app/reels');
}
