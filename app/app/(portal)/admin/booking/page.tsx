import { requireAdmin } from '@/lib/auth';
import { getAllTenants, getBookingsForTenant, getTodaysBookingCount, getWeekRevenue, getActiveTenantCount } from './_lib/queries';
import { PageHeader, StatsCard, Card, Chip } from '@/app/app/components/ui';
import Link from 'next/link';
import { formatPrice, formatBookingRef, formatDate, formatTime } from './_lib/formatters';
import { bookingStatusLabel, bookingStatusVariant } from './_lib/types';
import { TenantSelector } from './_components/tenant-selector';

interface Props {
    searchParams: Promise<{ tenant?: string }>;
}

export default async function BookingDashboardPage({ searchParams }: Props) {
    await requireAdmin();

    const { tenant: tenantParam } = await searchParams;
    const tenants = await getAllTenants();
    const activeTenant = (tenantParam ? tenants.find((t: { id: string }) => t.id === tenantParam) : null)
        ?? tenants.find((t: { status: string }) => t.status === 'active')
        ?? tenants[0];

    if (!activeTenant) {
        return (
            <div>
                <PageHeader
                    title="Booking OS"
                    description="Multi-tenant booking management"
                    action={
                        <Link href="/app/admin/booking/launchpad" className="btn-primary text-sm">
                            Create Tenant
                        </Link>
                    }
                />
                <Card>
                    <div className="py-12 text-center">
                        <p className="text-sm text-neutral-500">No tenants configured yet.</p>
                        <Link href="/app/admin/booking/launchpad" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                            Set up your first tenant
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    const tenantId = activeTenant.id;

    const [todaysCount, weekRevenue, tenantCount, recentBookings] = await Promise.all([
        getTodaysBookingCount(tenantId),
        getWeekRevenue(tenantId),
        getActiveTenantCount(),
        getBookingsForTenant(tenantId, { limit: 5 }),
    ]);

    return (
        <div>
            <PageHeader
                title="Booking OS"
                description={`Managing ${activeTenant.name}`}
                action={<TenantSelector tenants={tenants} activeTenantId={activeTenant.id} />}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <Link href={`/app/admin/booking/bookings?tenant=${tenantId}`}>
                    <StatsCard label="Today's Bookings" value={todaysCount} icon="checkSquare" />
                </Link>
                <StatsCard label="This Week" value={formatPrice(weekRevenue)} icon="creditCard" />
                <Link href="/app/admin/booking/launchpad">
                    <StatsCard label="Active Tenants" value={tenantCount} icon="building" />
                </Link>
                <Link href={`/app/admin/booking/reports?tenant=${tenantId}`}>
                    <StatsCard label="Reports" value="View" icon="barChart" />
                </Link>
            </div>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-neutral-900">Recent Bookings</h2>
                    <Link href={`/app/admin/booking/bookings?tenant=${tenantId}`} className="text-xs text-blue-600 hover:underline">
                        View all
                    </Link>
                </div>
                {recentBookings.length === 0 ? (
                    <p className="text-sm text-neutral-500 py-4 text-center">No bookings yet</p>
                ) : (
                    <div className="space-y-2">
                        {recentBookings.map((b: Record<string, unknown>) => {
                            const client = b.booking_clients as Record<string, string> | null;
                            const status = b.status as string;
                            return (
                                <Link
                                    key={b.id as string}
                                    href={`/app/admin/booking/bookings/${b.id}?tenant=${tenantId}`}
                                    className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-neutral-900">
                                            {client?.first_name} {client?.last_name}
                                        </p>
                                        <p className="text-xs text-neutral-500">
                                            {formatBookingRef(b.id as string)} - {formatDate(b.starts_at as string)} at {formatTime(b.starts_at as string)}
                                        </p>
                                    </div>
                                    <Chip variant={(bookingStatusVariant[status] ?? 'default') as 'default'}>
                                        {bookingStatusLabel[status] ?? status}
                                    </Chip>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}
