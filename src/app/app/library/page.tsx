import LibraryContent from './LibraryContent';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function LibraryPage() {
  return <LibraryContent />;
}
