import { requireAdmin } from '@/lib/auth';
import { getTenantById, getTenantPolicies, getTenantBranding, getServicesForTenant, getStaffForTenant, getMessageTemplates } from '../../_lib/queries';
import { SetupWizardClient } from './SetupWizardClient';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ tenantId: string }>;
}

export default async function SetupWizardPage({ params }: Props) {
    await requireAdmin();

    const { tenantId } = await params;
    const tenant = await getTenantById(tenantId);
    if (!tenant) return notFound();

    const [policies, branding, servicesData, staff, templates] = await Promise.all([
        getTenantPolicies(tenantId),
        getTenantBranding(tenantId),
        getServicesForTenant(tenantId),
        getStaffForTenant(tenantId),
        getMessageTemplates(tenantId),
    ]);

    return (
        <SetupWizardClient
            tenant={tenant}
            policies={policies}
            branding={branding}
            categories={servicesData.categories}
            services={servicesData.services}
            addons={servicesData.addons}
            staff={staff}
            templates={templates}
        />
    );
}
