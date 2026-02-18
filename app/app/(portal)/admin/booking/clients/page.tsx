import { requireAdmin } from '@/lib/auth';
import { getAllTenants, getClientsForTenant } from '../_lib/queries';
import { ClientsClient } from './ClientsClient';
import { PageHeader } from '@/app/app/components/ui';
import { TenantSelector } from '../_components/tenant-selector';

interface Props {
    searchParams: Promise<{ tenant?: string }>;
}

export default async function ClientsPage({ searchParams }: Props) {
    await requireAdmin();

    const { tenant: tenantParam } = await searchParams;
    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];

    if (!activeTenant) {
        return <div className="p-8 text-center text-sm text-neutral-500">No tenant configured</div>;
    }

    const clients = await getClientsForTenant(activeTenant.id);

    return (
        <div>
            <PageHeader
                title="Clients"
                description={activeTenant.name}
                action={<TenantSelector tenants={tenants} activeTenantId={activeTenant.id} />}
            />
            <ClientsClient clients={clients} tenantId={activeTenant.id} />
        </div>
    );
}
