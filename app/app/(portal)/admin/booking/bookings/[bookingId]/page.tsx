import { requireAdmin } from '@/lib/auth';
import { getAllTenants, getBookingById, getBookingStatusHistory, getBookingMessageLogs } from '../../_lib/queries';
import { BookingDetailClient } from './BookingDetailClient';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ bookingId: string }>;
    searchParams: Promise<{ tenant?: string }>;
}

export default async function BookingDetailPage({ params, searchParams }: Props) {
    await requireAdmin();

    const [{ bookingId }, { tenant: tenantParam }] = await Promise.all([params, searchParams]);

    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];

    if (!activeTenant) return notFound();

    const booking = await getBookingById(activeTenant.id, bookingId);
    if (!booking) return notFound();

    const [statusHistory, messageLogs] = await Promise.all([
        getBookingStatusHistory(bookingId),
        getBookingMessageLogs(bookingId),
    ]);

    return (
        <BookingDetailClient
            booking={booking}
            statusHistory={statusHistory}
            messageLogs={messageLogs}
            tenantId={activeTenant.id}
        />
    );
}
