import BillingContent from './BillingContent';

// Force dynamic rendering due to useSearchParams in client component
export const dynamic = 'force-dynamic';

export default function BillingPage() {
  return <BillingContent />;
}
