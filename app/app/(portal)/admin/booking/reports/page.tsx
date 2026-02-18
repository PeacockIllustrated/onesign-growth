import { requireAdmin } from '@/lib/auth';
import { getAllTenants } from '../_lib/queries';
import { ReportsClient } from './ReportsClient';
import { PageHeader } from '@/app/app/components/ui';
import { TenantSelector } from '../_components/tenant-selector';

interface Props {
    searchParams: Promise<{ tenant?: string }>;
}

export default async function ReportsPage({ searchParams }: Props) {
    await requireAdmin();

    const { tenant: tenantParam } = await searchParams;
    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];

    if (!activeTenant) {
        return <div className="p-8 text-center text-sm text-neutral-500">No tenant configured</div>;
    }

    return (
        <div>
            <PageHeader
                title="Reports"
                description={activeTenant.name}
                action={<TenantSelector tenants={tenants} activeTenantId={activeTenant.id} />}
            />
            <ReportsClient tenantId={activeTenant.id} currency={activeTenant.currency ?? 'GBP'} />
        </div>
    );
}
