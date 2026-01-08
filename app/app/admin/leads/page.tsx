import { createServerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';
import { PageHeader } from '../../components/ui';
import { LeadsClient } from './LeadsClient';

export default async function AdminLeadsPage() {
    await requireAdmin();

    const supabase = await createServerClient();

    const { data: leads, error } = await supabase
        .from('marketing_leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching leads:', error);
    }

    return (
        <div>
            <PageHeader
                title="Leads"
                description="Manage enquiries from the growth wizard"
            />
            <LeadsClient initialLeads={leads || []} />
        </div>
    );
}
