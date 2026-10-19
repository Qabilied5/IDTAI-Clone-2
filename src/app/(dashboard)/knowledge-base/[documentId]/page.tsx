import { KbDetail } from "@/components/knowledge-base/KbDetail";

export default function KnowledgeBaseDocumentPage({ params }: { params: { documentId: string } }) {
  return <KbDetail documentId={params.documentId} />;
}
