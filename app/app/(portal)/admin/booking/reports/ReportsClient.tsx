'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, StatsCard } from '@/app/app/components/ui';
import { formatPrice } from '../_lib/formatters';
import { fetchBookingStats, fetchStaffUtilisation, fetchBookingsForExport } from '../_lib/actions';
import { Download } from 'lucide-react';

interface ReportsClientProps {
    tenantId: string;
    currency: string;
}

interface Stats {
    totalBookings: number;
    totalRevenue: number;
    noShows: number;
    noShowRate: number;
    bookings: Record<string, unknown>[];
}

interface StaffUtil {
    staff: Record<string, unknown>[];
    availability: Record<string, unknown>[];
    bookings: Record<string, unknown>[];
}

export function ReportsClient({ tenantId, currency }: ReportsClientProps) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [from, setFrom] = useState(firstOfMonth);
    const [to, setTo] = useState(lastOfMonth);
    const [stats, setStats] = useState<Stats | null>(null);
    const [staffUtil, setStaffUtil] = useState<StaffUtil | null>(null);
    const [loading, setLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [statsData, utilData] = await Promise.all([
            fetchBookingStats(tenantId, from, to),
            fetchStaffUtilisation(tenantId, from, to),
        ]);
        setStats(statsData as Stats);
        setStaffUtil(utilData as StaffUtil);
        setLoading(false);
    }, [tenantId, from, to]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleExport() {
        const data = await fetchBookingsForExport(tenantId, from, to);
        if (!Array.isArray(data) || data.length === 0) return;

        const header = 'ID,Status,Date,Client,Staff,Service,Total\n';
        const rows = data.map((b: Record<string, unknown>) => {
            const client = b.booking_clients as Record<string, string> | null;
            const staffProfile = b.booking_staff_profiles as Record<string, string> | null;
            const items = b.booking_items as Record<string, string>[] | null;
            return [
                (b.id as string).slice(0, 8),
                b.status as string,
                b.starts_at as string,
                `${client?.first_name ?? ''} ${client?.last_name ?? ''}`,
                staffProfile?.display_name ?? '',
                items?.map(i => i.service_name).join('; ') ?? '',
                ((b.total_price_pence as number) / 100).toFixed(2),
            ].map(v => `"${v}"`).join(',');
        }).join('\n');

        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `booking-report-${from}-${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Calculate staff utilisation
    const utilisationRows = staffUtil ? staffUtil.staff.map(s => {
        const staffId = s.id as string;

        // Calculate available hours from availability records and date range
        const staffAvail = staffUtil.availability.filter(a => a.staff_id === staffId);
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const dayCount = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        let availableMinutes = 0;
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(fromDate);
            d.setDate(d.getDate() + i);
            const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1; // Convert to 0=Mon
            const daySlots = staffAvail.filter(a => a.day_of_week === dayOfWeek);
            daySlots.forEach(slot => {
                const [sh, sm] = (slot.start_time as string).split(':').map(Number);
                const [eh, em] = (slot.end_time as string).split(':').map(Number);
                availableMinutes += (eh * 60 + em) - (sh * 60 + sm);
            });
        }

        // Calculate booked hours
        const staffBookings = staffUtil.bookings.filter(b => b.staff_id === staffId);
        let bookedMinutes = 0;
        staffBookings.forEach(b => {
            const start = new Date(b.starts_at as string);
            const end = new Date(b.ends_at as string);
            bookedMinutes += (end.getTime() - start.getTime()) / 60000;
        });

        const availableHours = Math.round(availableMinutes / 60 * 10) / 10;
        const bookedHours = Math.round(bookedMinutes / 60 * 10) / 10;
        const utilPct = availableMinutes > 0 ? Math.round((bookedMinutes / availableMinutes) * 100) : 0;

        return {
            name: s.display_name as string,
            availableHours,
            bookedHours,
            utilPct,
        };
    }) : [];

    // Daily booking volume (simple bar chart)
    const dailyVolume = stats ? (() => {
        const map = new Map<string, number>();
        stats.bookings.forEach(b => {
            const day = (b.starts_at as string).split('T')[0];
            map.set(day, (map.get(day) ?? 0) + 1);
        });
        const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const maxVal = Math.max(...entries.map(e => e[1]), 1);
        return entries.map(([day, count]) => ({ day, count, pct: (count / maxVal) * 100 }));
    })() : [];

    const cancelled = stats ? stats.bookings.filter(b => b.status === 'cancelled').length : 0;

    return (
        <div>
            <PageHeader
                title="Reports"
                description="Booking analytics and performance"
                action={
                    <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-2">
                        <Download size={14} />
                        Export CSV
                    </button>
                }
            />

            {/* Date range */}
            <Card className="mb-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">From</label>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                            className="border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">To</label>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                            className="border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm" />
                    </div>
                    <button onClick={loadData} className="btn-primary text-sm mt-4">
                        Apply
                    </button>
                </div>
            </Card>

            {loading ? (
                <div className="py-12 text-center text-sm text-neutral-500">Loading reports...</div>
            ) : stats ? (
                <>
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <StatsCard label="Total Bookings" value={stats.totalBookings} icon="checkSquare" />
                        <StatsCard label="Revenue" value={formatPrice(stats.totalRevenue, currency)} icon="creditCard" />
                        <StatsCard label="No-show Rate" value={`${stats.noShowRate}%`} sublabel={`${stats.noShows} no-shows`} icon="users" />
                        <StatsCard label="Cancellations" value={cancelled} icon="barChart" />
                    </div>

                    {/* Booking volume chart */}
                    {dailyVolume.length > 0 && (
                        <Card className="mb-4">
                            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Daily Booking Volume</h3>
                            <div className="space-y-1">
                                {dailyVolume.map(({ day, count, pct }) => (
                                    <div key={day} className="flex items-center gap-2 text-sm">
                                        <span className="w-20 text-xs text-neutral-500 text-right shrink-0">
                                            {new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </span>
                                        <div className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-neutral-800 rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="w-8 text-xs text-neutral-600 text-right">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Staff utilisation */}
                    {utilisationRows.length > 0 && (
                        <Card>
                            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Staff Utilisation</h3>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-neutral-200">
                                        <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Staff</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Booked</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Available</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Utilisation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50">
                                    {utilisationRows.map(row => (
                                        <tr key={row.name}>
                                            <td className="px-4 py-2 text-sm font-medium">{row.name}</td>
                                            <td className="px-4 py-2 text-sm text-right">{row.bookedHours}h</td>
                                            <td className="px-4 py-2 text-sm text-right">{row.availableHours}h</td>
                                            <td className="px-4 py-2 text-sm text-right">
                                                <span className={`font-medium ${row.utilPct >= 80 ? 'text-green-600' : row.utilPct >= 50 ? 'text-amber-600' : 'text-neutral-600'}`}>
                                                    {row.utilPct}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </>
            ) : null}
        </div>
    );
}
