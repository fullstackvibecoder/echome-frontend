import ContentKitContent from './ContentKitContent';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function ContentKitPage() {
  return <ContentKitContent />;
}
