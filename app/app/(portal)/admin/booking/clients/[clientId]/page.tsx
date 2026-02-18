import { requireAdmin } from '@/lib/auth';
import { getAllTenants, getClientById, getClientBookings } from '../../_lib/queries';
import { ClientProfileClient } from './ClientProfileClient';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ clientId: string }>;
    searchParams: Promise<{ tenant?: string }>;
}

export default async function ClientProfilePage({ params, searchParams }: Props) {
    await requireAdmin();

    const [{ clientId }, { tenant: tenantParam }] = await Promise.all([params, searchParams]);

    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];
    if (!activeTenant) return notFound();

    const client = await getClientById(activeTenant.id, clientId);
    if (!client) return notFound();

    const bookings = await getClientBookings(activeTenant.id, clientId);

    return (
        <ClientProfileClient
            client={client}
            bookings={bookings}
            tenantId={activeTenant.id}
        />
    );
}
