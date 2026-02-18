'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, Card, Chip, Modal } from '@/app/app/components/ui';
import { formatDate, formatTime, DAY_NAMES } from '../../_lib/formatters';
import { updateStaff, setStaffAvailability, setStaffServices, createTimeOff } from '../../_lib/actions';
import { ArrowLeft } from 'lucide-react';

interface StaffProfileClientProps {
    staff: Record<string, unknown>;
    availability: Record<string, unknown>[];
    timeOff: Record<string, unknown>[];
    bookings: Record<string, unknown>[];
    services: Record<string, unknown>[];
    assignedServiceIds: string[];
    tenantId: string;
}

interface AvailRow {
    day_of_week: number;
    start_time: string;
    end_time: string;
}

export function StaffProfileClient({
    staff,
    availability,
    timeOff,
    bookings,
    services,
    assignedServiceIds,
    tenantId,
}: StaffProfileClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const staffId = staff.id as string;

    // Profile form
    const [displayName, setDisplayName] = useState(staff.display_name as string);
    const [email, setEmail] = useState(staff.email as string);
    const [phone, setPhone] = useState((staff.phone as string) ?? '');
    const [role, setRole] = useState(staff.role as string);
    const [bio, setBio] = useState((staff.bio as string) ?? '');
    const [isActive, setIsActive] = useState(staff.is_active as boolean);

    // Availability
    const [hours, setHours] = useState<AvailRow[]>(
        availability.map(a => ({
            day_of_week: a.day_of_week as number,
            start_time: a.start_time as string,
            end_time: a.end_time as string,
        }))
    );

    // Services
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set(assignedServiceIds));

    // Time off modal
    const [timeOffOpen, setTimeOffOpen] = useState(false);
    const [toStartDate, setToStartDate] = useState('');
    const [toEndDate, setToEndDate] = useState('');
    const [toReason, setToReason] = useState('');

    function handleSaveProfile() {
        startTransition(async () => {
            await updateStaff(staffId, {
                display_name: displayName.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                role,
                bio: bio.trim() || null,
                is_active: isActive,
            });
            router.refresh();
        });
    }

    function updateHour(day: number, field: 'start_time' | 'end_time', value: string) {
        setHours(prev => {
            const existing = prev.find(h => h.day_of_week === day);
            if (existing) {
                return prev.map(h => h.day_of_week === day ? { ...h, [field]: value } : h);
            }
            return [...prev, {
                day_of_week: day,
                start_time: field === 'start_time' ? value : '09:00',
                end_time: field === 'end_time' ? value : '17:00',
            }];
        });
    }

    function clearDay(day: number) {
        setHours(prev => prev.filter(h => h.day_of_week !== day));
    }

    function handleSaveAvailability() {
        const validHours = hours.filter(h => h.start_time && h.end_time);
        startTransition(async () => {
            await setStaffAvailability(tenantId, staffId, validHours);
            router.refresh();
        });
    }

    function toggleService(serviceId: string) {
        setSelectedServices(prev => {
            const next = new Set(prev);
            if (next.has(serviceId)) next.delete(serviceId);
            else next.add(serviceId);
            return next;
        });
    }

    function handleSaveServices() {
        startTransition(async () => {
            await setStaffServices(tenantId, staffId, Array.from(selectedServices));
            router.refresh();
        });
    }

    function handleAddTimeOff() {
        if (!toStartDate || !toEndDate) return;
        startTransition(async () => {
            await createTimeOff(tenantId, staffId, {
                start_date: toStartDate,
                end_date: toEndDate,
                reason: toReason.trim() || undefined,
            });
            setTimeOffOpen(false);
            setToStartDate('');
            setToEndDate('');
            setToReason('');
            router.refresh();
        });
    }

    return (
        <div>
            <Link
                href="/app/admin/booking/staff"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
            >
                <ArrowLeft size={14} />
                Back to staff
            </Link>

            <PageHeader title={staff.display_name as string} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column */}
                <div className="space-y-4">
                    {/* Profile */}
                    <Card>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Profile</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Display Name</label>
                                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">Role</label>
                                    <select value={role} onChange={(e) => setRole(e.target.value)}
                                        className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm">
                                        <option value="owner">Owner</option>
                                        <option value="manager">Manager</option>
                                        <option value="staff">Staff</option>
                                        <option value="reception">Reception</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                                        Active
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Bio</label>
                                <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" rows={3} />
                            </div>
                            <button onClick={handleSaveProfile} disabled={isPending} className="btn-primary text-sm">
                                {isPending ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    </Card>

                    {/* Working hours */}
                    <Card>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Working Hours</h3>
                        <div className="space-y-2">
                            {DAY_NAMES.map((day, idx) => {
                                const row = hours.find(h => h.day_of_week === idx);
                                return (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                        <span className="w-20 font-medium">{day.slice(0, 3)}</span>
                                        <input
                                            type="time"
                                            value={row?.start_time ?? ''}
                                            onChange={(e) => updateHour(idx, 'start_time', e.target.value)}
                                            className="border border-neutral-200 rounded-[var(--radius-sm)] p-1 text-sm"
                                        />
                                        <span className="text-neutral-400">to</span>
                                        <input
                                            type="time"
                                            value={row?.end_time ?? ''}
                                            onChange={(e) => updateHour(idx, 'end_time', e.target.value)}
                                            className="border border-neutral-200 rounded-[var(--radius-sm)] p-1 text-sm"
                                        />
                                        {row && (
                                            <button onClick={() => clearDay(idx)} className="text-xs text-red-500 hover:underline">
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <button onClick={handleSaveAvailability} disabled={isPending} className="btn-primary text-sm mt-3">
                            {isPending ? 'Saving...' : 'Save Hours'}
                        </button>
                    </Card>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                    {/* Qualified services */}
                    <Card>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Qualified Services</h3>
                        {services.length === 0 ? (
                            <p className="text-sm text-neutral-500">No services configured yet</p>
                        ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                                {services.map(svc => (
                                    <label key={svc.id as string} className="flex items-center gap-2 text-sm py-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedServices.has(svc.id as string)}
                                            onChange={() => toggleService(svc.id as string)}
                                        />
                                        {svc.name as string}
                                    </label>
                                ))}
                            </div>
                        )}
                        <button onClick={handleSaveServices} disabled={isPending} className="btn-primary text-sm mt-3">
                            {isPending ? 'Saving...' : 'Save Services'}
                        </button>
                    </Card>

                    {/* Time off */}
                    <Card>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-neutral-900">Time Off</h3>
                            <button onClick={() => setTimeOffOpen(true)} className="text-xs text-blue-600 hover:underline">
                                + Add
                            </button>
                        </div>
                        {timeOff.length === 0 ? (
                            <p className="text-sm text-neutral-500">No time off scheduled</p>
                        ) : (
                            <div className="space-y-2">
                                {timeOff.map(to => (
                                    <div key={to.id as string} className="flex justify-between text-sm border-b border-neutral-50 pb-2 last:border-0">
                                        <div>
                                            <p className="font-medium">{formatDate(to.start_date as string)} - {formatDate(to.end_date as string)}</p>
                                            {to.reason ? <p className="text-xs text-neutral-500">{String(to.reason)}</p> : null}
                                        </div>
                                        <Chip variant={to.approved ? 'approved' : 'review'}>
                                            {(to.approved as boolean) ? 'Approved' : 'Pending'}
                                        </Chip>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Upcoming bookings */}
                    <Card>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Upcoming Bookings</h3>
                        {bookings.length === 0 ? (
                            <p className="text-sm text-neutral-500">No upcoming bookings</p>
                        ) : (
                            <div className="space-y-2">
                                {bookings.map(b => {
                                    const client = b.booking_clients as Record<string, string> | null;
                                    const items = b.booking_items as Record<string, string>[] | null;
                                    return (
                                        <Link
                                            key={b.id as string}
                                            href={`/app/admin/booking/bookings/${b.id}`}
                                            className="flex justify-between text-sm p-2 rounded hover:bg-neutral-50 transition-colors"
                                        >
                                            <div>
                                                <p className="font-medium">{client?.first_name} {client?.last_name}</p>
                                                <p className="text-xs text-neutral-500">
                                                    {items?.[0]?.service_name ?? 'Service'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs">{formatDate(b.starts_at as string)}</p>
                                                <p className="text-xs text-neutral-500">{formatTime(b.starts_at as string)}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Time off modal */}
            <Modal open={timeOffOpen} onClose={() => setTimeOffOpen(false)} title="Add Time Off">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
                            <input type="date" value={toStartDate} onChange={(e) => setToStartDate(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
                            <input type="date" value={toEndDate} onChange={(e) => setToEndDate(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Reason</label>
                        <input type="text" value={toReason} onChange={(e) => setToReason(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                            placeholder="e.g. Holiday, Personal" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setTimeOffOpen(false)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleAddTimeOff} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Adding...' : 'Add Time Off'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
