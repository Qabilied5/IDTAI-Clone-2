import LeadDetailContent from '@/components/leads/LeadDetailContent';

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <LeadDetailContent leadId={Number(leadId)} />;
}