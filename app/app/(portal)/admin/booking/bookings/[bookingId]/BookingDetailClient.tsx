'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, Card, Chip, Modal } from '@/app/app/components/ui';
import { formatPrice, formatBookingRef, formatDate, formatTime, formatMinutes } from '../../_lib/formatters';
import { bookingStatusVariant, bookingStatusLabel } from '../../_lib/types';
import { cancelBookingAdmin, markNoShowAdmin, completeBookingAdmin } from '../../_lib/actions';
import { ArrowLeft, Clock, User, Scissors, CreditCard, MessageSquare } from 'lucide-react';

interface BookingDetailClientProps {
    booking: Record<string, unknown>;
    statusHistory: Record<string, unknown>[];
    messageLogs: Record<string, unknown>[];
    tenantId: string;
}

export function BookingDetailClient({ booking, statusHistory, messageLogs, tenantId }: BookingDetailClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const status = booking.status as string;
    const client = booking.booking_clients as Record<string, unknown> | null;
    const staffProfile = booking.booking_staff_profiles as Record<string, unknown> | null;
    const items = booking.booking_items as Record<string, unknown>[] | null;

    const startsAt = new Date(booking.starts_at as string);
    const endsAt = new Date(booking.ends_at as string);
    const durationMin = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);

    function handleCancel() {
        startTransition(async () => {
            await cancelBookingAdmin(tenantId, booking.id as string, cancelReason || undefined);
            setCancelOpen(false);
            router.refresh();
        });
    }

    function handleNoShow() {
        startTransition(async () => {
            await markNoShowAdmin(tenantId, booking.id as string);
            router.refresh();
        });
    }

    function handleComplete() {
        startTransition(async () => {
            await completeBookingAdmin(tenantId, booking.id as string);
            router.refresh();
        });
    }

    return (
        <div>
            <Link
                href="/app/admin/booking/bookings"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
            >
                <ArrowLeft size={14} />
                Back to bookings
            </Link>

            <PageHeader
                title={`Booking ${formatBookingRef(booking.id as string)}`}
                description={`Created ${formatDate(booking.created_at as string)}`}
                action={
                    <Chip variant={(bookingStatusVariant[status] ?? 'default') as 'default'}>
                        {bookingStatusLabel[status] ?? status}
                    </Chip>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Left column - 2 cols wide */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Appointment */}
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <Clock size={16} className="text-neutral-400" />
                            <h3 className="text-sm font-semibold text-neutral-900">Appointment</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-neutral-500">Date</p>
                                <p className="font-medium">{formatDate(booking.starts_at as string)}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Time</p>
                                <p className="font-medium">{formatTime(booking.starts_at as string)} - {formatTime(booking.ends_at as string)}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Duration</p>
                                <p className="font-medium">{formatMinutes(durationMin)}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Staff</p>
                                <p className="font-medium">
                                    {staffProfile ? (
                                        <Link
                                            href={`/app/admin/booking/staff/${staffProfile.id}`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {staffProfile.display_name as string}
                                        </Link>
                                    ) : '-'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Client */}
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <User size={16} className="text-neutral-400" />
                            <h3 className="text-sm font-semibold text-neutral-900">Client</h3>
                        </div>
                        {client ? (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-neutral-500">Name</p>
                                    <p className="font-medium">
                                        <Link
                                            href={`/app/admin/booking/clients/${client.id}`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {client.first_name as string} {client.last_name as string}
                                        </Link>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-neutral-500">Email</p>
                                    <p className="font-medium">{client.email as string}</p>
                                </div>
                                <div>
                                    <p className="text-neutral-500">Phone</p>
                                    <p className="font-medium">{(client.phone as string) || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-neutral-500">Risk Tier</p>
                                    <Chip variant={client.risk_tier === 'vip' ? 'approved' : client.risk_tier === 'flagged' ? 'review' : 'default'}>
                                        {(client.risk_tier as string) ?? 'standard'}
                                    </Chip>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-500">Client not found</p>
                        )}
                    </Card>

                    {/* Services */}
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <Scissors size={16} className="text-neutral-400" />
                            <h3 className="text-sm font-semibold text-neutral-900">Services</h3>
                        </div>
                        {items && items.length > 0 ? (
                            <div className="space-y-2">
                                {items.map((item) => {
                                    const addons = item.booking_item_addons as Record<string, unknown>[] | null;
                                    return (
                                        <div key={item.id as string}>
                                            <div className="flex items-center justify-between text-sm">
                                                <div>
                                                    <span className="font-medium">{item.service_name as string}</span>
                                                    <span className="text-neutral-500 ml-2">{formatMinutes(item.duration_minutes as number)}</span>
                                                </div>
                                                <span>{formatPrice(item.price_pence as number)}</span>
                                            </div>
                                            {addons?.map((addon) => (
                                                <div key={addon.id as string} className="flex items-center justify-between text-sm pl-4 text-neutral-500">
                                                    <span>+ {addon.addon_name as string} ({formatMinutes(addon.duration_minutes as number)})</span>
                                                    <span>+{formatPrice(addon.price_pence as number)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-500">No services recorded</p>
                        )}
                    </Card>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                    {/* Payment */}
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <CreditCard size={16} className="text-neutral-400" />
                            <h3 className="text-sm font-semibold text-neutral-900">Payment</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Total</span>
                                <span className="font-semibold">{formatPrice(booking.total_price_pence as number)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Deposit</span>
                                <span>{formatPrice(booking.deposit_amount_pence as number ?? 0)}</span>
                            </div>
                            <div className="flex justify-between border-t border-neutral-100 pt-2">
                                <span className="text-neutral-500">Balance</span>
                                <span>{formatPrice((booking.total_price_pence as number) - (booking.deposit_amount_pence as number ?? 0))}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Status timeline */}
                    <Card>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Status History</h3>
                        {statusHistory.length === 0 ? (
                            <p className="text-sm text-neutral-500">No status changes recorded</p>
                        ) : (
                            <div className="space-y-3">
                                {statusHistory.map((entry) => (
                                    <div key={entry.id as string} className="flex gap-3 text-sm">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-neutral-300 shrink-0" />
                                        <div>
                                            <p>
                                                <span className="text-neutral-500">{entry.old_status as string ?? 'new'}</span>
                                                {' -> '}
                                                <span className="font-medium">{entry.new_status as string}</span>
                                            </p>
                                            {entry.reason ? (
                                                <p className="text-xs text-neutral-500">{String(entry.reason)}</p>
                                            ) : null}
                                            <p className="text-xs text-neutral-400">{formatDate(entry.created_at as string)} {formatTime(entry.created_at as string)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Messages */}
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={16} className="text-neutral-400" />
                            <h3 className="text-sm font-semibold text-neutral-900">Messages</h3>
                        </div>
                        {messageLogs.length === 0 ? (
                            <p className="text-sm text-neutral-500">No messages sent</p>
                        ) : (
                            <div className="space-y-2">
                                {messageLogs.map((msg) => (
                                    <div key={msg.id as string} className="text-sm border-b border-neutral-50 pb-2 last:border-0">
                                        <div className="flex justify-between">
                                            <span className="font-medium">{msg.template_slug as string}</span>
                                            <Chip variant={msg.status === 'sent' ? 'approved' : 'default'}>
                                                {msg.status as string}
                                            </Chip>
                                        </div>
                                        <p className="text-xs text-neutral-500">
                                            {msg.channel as string} - {formatDate(msg.created_at as string)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Notes */}
            {booking.notes ? (
                <Card className="mb-4">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">Notes</h3>
                    <p className="text-sm text-neutral-700">{String(booking.notes)}</p>
                </Card>
            ) : null}

            {/* Cancellation info */}
            {booking.cancellation_reason ? (
                <Card className="mb-4">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">Cancellation</h3>
                    <p className="text-sm text-neutral-700">{String(booking.cancellation_reason)}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                        Cancelled by {String(booking.cancelled_by ?? 'unknown')} on {formatDate(booking.cancelled_at as string)}
                    </p>
                </Card>
            ) : null}

            {/* Actions */}
            {status === 'confirmed' && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Actions</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handleComplete}
                            disabled={isPending}
                            className="btn-primary text-sm"
                        >
                            Mark Complete
                        </button>
                        <button
                            onClick={handleNoShow}
                            disabled={isPending}
                            className="btn-secondary text-sm"
                        >
                            Mark No-show
                        </button>
                        <button
                            onClick={() => setCancelOpen(true)}
                            disabled={isPending}
                            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-[var(--radius-sm)] hover:bg-red-50 transition-colors"
                        >
                            Cancel Booking
                        </button>
                    </div>
                </Card>
            )}

            {/* Cancel modal */}
            <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Booking">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Reason (optional)</label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                            rows={3}
                            placeholder="Why is this booking being cancelled?"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setCancelOpen(false)} className="btn-secondary text-sm">
                            Keep Booking
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-[var(--radius-sm)] hover:bg-red-700 transition-colors"
                        >
                            {isPending ? 'Cancelling...' : 'Confirm Cancel'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
