import { requireAdmin } from '@/lib/auth';
import { getAllTenants, getServicesForTenant } from '../_lib/queries';
import { ServicesClient } from './ServicesClient';
import { PageHeader } from '@/app/app/components/ui';
import { TenantSelector } from '../_components/tenant-selector';

interface Props {
    searchParams: Promise<{ tenant?: string }>;
}

export default async function ServicesPage({ searchParams }: Props) {
    await requireAdmin();

    const { tenant: tenantParam } = await searchParams;
    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];

    if (!activeTenant) {
        return <div className="p-8 text-center text-sm text-neutral-500">No tenant configured</div>;
    }

    const { categories, services, addons } = await getServicesForTenant(activeTenant.id);

    return (
        <div>
            <PageHeader
                title="Services"
                description={activeTenant.name}
                action={<TenantSelector tenants={tenants} activeTenantId={activeTenant.id} />}
            />
            <ServicesClient
                categories={categories}
                services={services}
                addons={addons}
                tenantId={activeTenant.id}
            />
        </div>
    );
}
