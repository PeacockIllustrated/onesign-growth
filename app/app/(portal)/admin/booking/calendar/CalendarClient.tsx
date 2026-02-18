'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card } from '@/app/app/components/ui';
import { fetchCalendarBookings } from '../_lib/actions';
import { formatTime } from '../_lib/formatters';
import { bookingStatusVariant } from '../_lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarClientProps {
    staff: Record<string, unknown>[];
    tenantId: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 09:00 - 18:00

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatWeekLabel(start: Date): string {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(start)} - ${fmt(end)} ${end.getFullYear()}`;
}

function toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
}

export function CalendarClient({ staff, tenantId }: CalendarClientProps) {
    const router = useRouter();
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [staffFilter, setStaffFilter] = useState('all');
    const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(false);

    const loadBookings = useCallback(async () => {
        setLoading(true);
        const from = weekStart.toISOString();
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 7);
        const to = end.toISOString();

        const data = await fetchCalendarBookings(
            tenantId,
            from,
            to,
            staffFilter !== 'all' ? staffFilter : undefined
        );
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
    }, [tenantId, weekStart, staffFilter]);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    function prevWeek() {
        setWeekStart(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 7);
            return d;
        });
    }

    function nextWeek() {
        setWeekStart(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 7);
            return d;
        });
    }

    function goToday() {
        setWeekStart(getWeekStart(new Date()));
    }

    // Group bookings by day of week (0=Mon)
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return toDateStr(d);
    });

    const ROW_HEIGHT = 60; // pixels per hour

    return (
        <div>
            <PageHeader title="Calendar" />

            {/* Controls */}
            <Card className="mb-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                        <button onClick={prevWeek} className="p-1 hover:bg-neutral-100 rounded transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={goToday} className="px-3 py-1 text-sm font-medium hover:bg-neutral-100 rounded transition-colors">
                            Today
                        </button>
                        <button onClick={nextWeek} className="p-1 hover:bg-neutral-100 rounded transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <span className="text-sm font-medium text-neutral-700">{formatWeekLabel(weekStart)}</span>
                    <select
                        value={staffFilter}
                        onChange={(e) => setStaffFilter(e.target.value)}
                        className="ml-auto text-sm border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-1.5"
                    >
                        <option value="all">All staff</option>
                        {staff.map(s => (
                            <option key={s.id as string} value={s.id as string}>{s.display_name as string}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Calendar grid */}
            <Card>
                {loading ? (
                    <div className="py-12 text-center text-sm text-neutral-500">Loading calendar...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Day headers */}
                            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-neutral-200">
                                <div />
                                {DAY_LABELS.map((label, i) => (
                                    <div key={i} className="px-2 py-2 text-center text-xs font-medium text-neutral-500 border-l border-neutral-100">
                                        <div>{label}</div>
                                        <div className="text-sm text-neutral-900">
                                            {new Date(days[i]).getDate()}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Time rows */}
                            <div className="relative">
                                {HOURS.map(hour => (
                                    <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ height: ROW_HEIGHT }}>
                                        <div className="px-2 py-1 text-xs text-neutral-400 text-right pr-3 border-r border-neutral-100">
                                            {String(hour).padStart(2, '0')}:00
                                        </div>
                                        {days.map((day, dayIdx) => (
                                            <div key={dayIdx} className="relative border-l border-b border-neutral-50" />
                                        ))}
                                    </div>
                                ))}

                                {/* Booking blocks */}
                                {bookings.map(b => {
                                    const start = new Date(b.starts_at as string);
                                    const end = new Date(b.ends_at as string);
                                    const dateStr = toDateStr(start);
                                    const dayIdx = days.indexOf(dateStr);
                                    if (dayIdx === -1) return null;

                                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                                    const endMinutes = end.getHours() * 60 + end.getMinutes();
                                    const top = ((startMinutes - 540) / 60) * ROW_HEIGHT; // 540 = 9*60
                                    const height = ((endMinutes - startMinutes) / 60) * ROW_HEIGHT;

                                    if (top < 0 || height <= 0) return null;

                                    const client = b.booking_clients as Record<string, string> | null;
                                    const items = b.booking_items as Record<string, string>[] | null;
                                    const status = b.status as string;

                                    const colStart = 60; // left time column width
                                    const colWidth = `calc((100% - 60px) / 7)`;
                                    const left = `calc(60px + ${dayIdx} * ${colWidth})`;

                                    return (
                                        <button
                                            key={b.id as string}
                                            onClick={() => router.push(`/app/admin/booking/bookings/${b.id}`)}
                                            className="absolute rounded-[var(--radius-sm)] px-1.5 py-0.5 text-left overflow-hidden transition-opacity hover:opacity-80"
                                            style={{
                                                top,
                                                height: Math.max(height, 20),
                                                left,
                                                width: colWidth,
                                                backgroundColor: status === 'confirmed' ? '#dcfce7' : status === 'completed' ? '#d1fae5' : '#f3f4f6',
                                                borderLeft: `3px solid ${status === 'confirmed' ? '#16a34a' : status === 'completed' ? '#059669' : '#9ca3af'}`,
                                            }}
                                        >
                                            <p className="text-[10px] font-medium text-neutral-900 truncate">
                                                {formatTime(b.starts_at as string)} {client?.first_name}
                                            </p>
                                            {height > 30 && (
                                                <p className="text-[10px] text-neutral-600 truncate">
                                                    {items?.[0]?.service_name}
                                                </p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
