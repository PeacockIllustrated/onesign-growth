import { requireAdmin } from '@/lib/auth';
import { getAllTenants, getStaffForTenant } from '../_lib/queries';
import { StaffClient } from './StaffClient';
import { PageHeader } from '@/app/app/components/ui';
import { TenantSelector } from '../_components/tenant-selector';

interface Props {
    searchParams: Promise<{ tenant?: string }>;
}

export default async function StaffPage({ searchParams }: Props) {
    await requireAdmin();

    const { tenant: tenantParam } = await searchParams;
    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];

    if (!activeTenant) {
        return <div className="p-8 text-center text-sm text-neutral-500">No tenant configured</div>;
    }

    const staff = await getStaffForTenant(activeTenant.id);

    return (
        <div>
            <PageHeader
                title="Staff"
                description={activeTenant.name}
                action={<TenantSelector tenants={tenants} activeTenantId={activeTenant.id} />}
            />
            <StaffClient staff={staff} tenantId={activeTenant.id} />
        </div>
    );
}
