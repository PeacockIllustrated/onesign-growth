import { requireAdmin } from '@/lib/auth';
import { getAllTenants, getStaffById, getStaffAvailability, getStaffTimeOff, getStaffBookings, getServicesForTenant, getStaffServices } from '../../_lib/queries';
import { StaffProfileClient } from './StaffProfileClient';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ staffId: string }>;
    searchParams: Promise<{ tenant?: string }>;
}

export default async function StaffProfilePage({ params, searchParams }: Props) {
    await requireAdmin();

    const [{ staffId }, { tenant: tenantParam }] = await Promise.all([params, searchParams]);

    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];
    if (!activeTenant) return notFound();

    const staff = await getStaffById(activeTenant.id, staffId);
    if (!staff) return notFound();

    const [availability, timeOff, bookings, servicesData, staffServiceLinks] = await Promise.all([
        getStaffAvailability(activeTenant.id, staffId),
        getStaffTimeOff(activeTenant.id, staffId),
        getStaffBookings(activeTenant.id, staffId),
        getServicesForTenant(activeTenant.id),
        getStaffServices(activeTenant.id),
    ]);

    const myServiceIds = staffServiceLinks
        .filter((s: { staff_id: string }) => s.staff_id === staffId)
        .map((s: { service_id: string }) => s.service_id);

    return (
        <StaffProfileClient
            staff={staff}
            availability={availability}
            timeOff={timeOff}
            bookings={bookings}
            services={servicesData.services}
            assignedServiceIds={myServiceIds}
            tenantId={activeTenant.id}
        />
    );
}
