import KnowledgeContent from './KnowledgeContent';

// Force dynamic rendering due to client hooks
export const dynamic = 'force-dynamic';

export default function KnowledgePage() {
  return <KnowledgeContent />;
}
