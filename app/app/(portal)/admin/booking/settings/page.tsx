import { requireAdmin } from '@/lib/auth';
import { getAllTenants, getTenantPolicies, getTenantBranding, getMessageTemplates } from '../_lib/queries';
import { SettingsClient } from './SettingsClient';
import { PageHeader } from '@/app/app/components/ui';
import { TenantSelector } from '../_components/tenant-selector';

interface Props {
    searchParams: Promise<{ tenant?: string }>;
}

export default async function SettingsPage({ searchParams }: Props) {
    await requireAdmin();

    const { tenant: tenantParam } = await searchParams;
    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];

    if (!activeTenant) {
        return <div className="p-8 text-center text-sm text-neutral-500">No tenant configured</div>;
    }

    const [policies, branding, templates] = await Promise.all([
        getTenantPolicies(activeTenant.id),
        getTenantBranding(activeTenant.id),
        getMessageTemplates(activeTenant.id),
    ]);

    return (
        <div>
            <PageHeader
                title="Settings"
                description={activeTenant.name}
                action={<TenantSelector tenants={tenants} activeTenantId={activeTenant.id} />}
            />
            <SettingsClient
                tenant={activeTenant}
                policies={policies}
                branding={branding}
                templates={templates}
                tenantId={activeTenant.id}
            />
        </div>
    );
}
