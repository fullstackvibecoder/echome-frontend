import { redirect } from 'next/navigation';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

// /app/reels/[id] never had a real page (the reel editor is a modal opened
// from the list). Bookmarks land here and bounce to the new Reels tab in
// the unified library — no need to round-trip through /app/reels first.
export default function ReelEditorPage() {
  redirect('/app/library?tab=reels');
}
