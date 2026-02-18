'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Chip, DataTable, EmptyState } from '@/app/app/components/ui';
import { formatPriceShort, formatBookingRef, formatDate, formatTime } from '../_lib/formatters';
import { bookingStatusVariant, bookingStatusLabel } from '../_lib/types';
import { Download } from 'lucide-react';

interface BookingsClientProps {
    bookings: Record<string, unknown>[];
    staff: Record<string, unknown>[];
    tenantId: string;
}

const STATUS_FILTERS = ['all', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

export function BookingsClient({ bookings, staff }: BookingsClientProps) {
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [staffFilter, setStaffFilter] = useState<string>('all');
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        return bookings.filter((b) => {
            if (statusFilter !== 'all' && b.status !== statusFilter) return false;
            if (staffFilter !== 'all' && b.staff_id !== staffFilter) return false;
            if (search) {
                const client = b.booking_clients as Record<string, string> | null;
                const term = search.toLowerCase();
                const name = `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.toLowerCase();
                const email = (client?.email ?? '').toLowerCase();
                if (!name.includes(term) && !email.includes(term)) return false;
            }
            return true;
        });
    }, [bookings, statusFilter, staffFilter, search]);

    const columns = [
        {
            key: 'ref',
            header: 'Ref',
            render: (row: Record<string, unknown>) => (
                <span className="font-mono text-xs">{formatBookingRef(row.id as string)}</span>
            ),
        },
        {
            key: 'client',
            header: 'Client',
            render: (row: Record<string, unknown>) => {
                const client = row.booking_clients as Record<string, string> | null;
                return (
                    <div>
                        <p className="font-medium">{client?.first_name} {client?.last_name}</p>
                        <p className="text-xs text-neutral-500">{client?.email}</p>
                    </div>
                );
            },
        },
        {
            key: 'services',
            header: 'Service(s)',
            render: (row: Record<string, unknown>) => {
                const items = row.booking_items as Record<string, string>[] | null;
                return (
                    <span className="text-xs">
                        {items?.map((i) => i.service_name).join(', ') ?? '-'}
                    </span>
                );
            },
        },
        {
            key: 'staff',
            header: 'Staff',
            render: (row: Record<string, unknown>) => {
                const staffProfile = row.booking_staff_profiles as Record<string, string> | null;
                return <span>{staffProfile?.display_name ?? '-'}</span>;
            },
        },
        {
            key: 'datetime',
            header: 'Date / Time',
            render: (row: Record<string, unknown>) => (
                <div>
                    <p>{formatDate(row.starts_at as string)}</p>
                    <p className="text-xs text-neutral-500">{formatTime(row.starts_at as string)}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: Record<string, unknown>) => {
                const status = row.status as string;
                return (
                    <Chip variant={(bookingStatusVariant[status] ?? 'default') as 'default'}>
                        {bookingStatusLabel[status] ?? status}
                    </Chip>
                );
            },
        },
        {
            key: 'total',
            header: 'Total',
            render: (row: Record<string, unknown>) => (
                <span className="font-medium">{formatPriceShort(row.total_price_pence as number)}</span>
            ),
        },
    ];

    function handleExport() {
        const header = 'Ref,Client,Email,Service,Staff,Date,Time,Status,Total\n';
        const rows = filtered.map((b) => {
            const client = b.booking_clients as Record<string, string> | null;
            const staffProfile = b.booking_staff_profiles as Record<string, string> | null;
            const items = b.booking_items as Record<string, string>[] | null;
            return [
                formatBookingRef(b.id as string),
                `${client?.first_name ?? ''} ${client?.last_name ?? ''}`,
                client?.email ?? '',
                items?.map((i) => i.service_name).join('; ') ?? '',
                staffProfile?.display_name ?? '',
                formatDate(b.starts_at as string),
                formatTime(b.starts_at as string),
                b.status as string,
                ((b.total_price_pence as number) / 100).toFixed(2),
            ].map((v) => `"${v}"`).join(',');
        }).join('\n');

        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div>
            <PageHeader
                title="Bookings"
                description="View and manage all bookings"
                action={
                    <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-2">
                        <Download size={14} />
                        Export CSV
                    </button>
                }
            />

            {/* Filters */}
            <Card className="mb-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Status chips */}
                    <div className="flex gap-1">
                        {STATUS_FILTERS.map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    statusFilter === s
                                        ? 'bg-neutral-900 text-white'
                                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                            >
                                {s === 'all' ? 'All' : bookingStatusLabel[s] ?? s}
                            </button>
                        ))}
                    </div>

                    {/* Staff filter */}
                    <select
                        value={staffFilter}
                        onChange={(e) => setStaffFilter(e.target.value)}
                        className="text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-1.5"
                    >
                        <option value="all">All staff</option>
                        {staff.map((s) => (
                            <option key={s.id as string} value={s.id as string}>
                                {s.display_name as string}
                            </option>
                        ))}
                    </select>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search client..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-1.5 w-48"
                    />
                </div>
            </Card>

            {/* Table */}
            <Card>
                <DataTable
                    columns={columns}
                    data={filtered as Record<string, unknown>[]}
                    keyField="id"
                    onRowClick={(row) => router.push(`/app/admin/booking/bookings/${row.id}`)}
                    emptyState={
                        <EmptyState
                            title="No bookings found"
                            description="Try adjusting your filters or check back later."
                        />
                    }
                />
            </Card>
        </div>
    );
}
