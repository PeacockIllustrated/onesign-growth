import { requireAdmin } from '@/lib/auth';
import { getAllTenants } from '../_lib/queries';
import { LaunchpadClient } from './LaunchpadClient';

export default async function LaunchpadPage() {
    await requireAdmin();

    const tenants = await getAllTenants();

    return <LaunchpadClient tenants={tenants} />;
}
