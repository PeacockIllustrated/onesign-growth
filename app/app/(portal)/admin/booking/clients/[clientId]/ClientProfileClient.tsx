'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, Card, Chip, StatsCard } from '@/app/app/components/ui';
import { formatPrice, formatPriceShort, formatDate, formatTime, formatBookingRef } from '../../_lib/formatters';
import { bookingStatusVariant, bookingStatusLabel } from '../../_lib/types';
import { updateClient } from '../../_lib/actions';
import { ArrowLeft } from 'lucide-react';

interface ClientProfileClientProps {
    client: Record<string, unknown>;
    bookings: Record<string, unknown>[];
    tenantId: string;
}

export function ClientProfileClient({ client, bookings, tenantId }: ClientProfileClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [firstName, setFirstName] = useState(client.first_name as string);
    const [lastName, setLastName] = useState(client.last_name as string);
    const [email, setEmail] = useState(client.email as string);
    const [phone, setPhone] = useState((client.phone as string) ?? '');
    const [riskTier, setRiskTier] = useState((client.risk_tier as string) ?? 'standard');
    const [notes, setNotes] = useState((client.notes as string) ?? '');

    const totalSpend = bookings.reduce((sum, b) => sum + ((b.total_price_pence as number) ?? 0), 0);

    function handleSave() {
        startTransition(async () => {
            await updateClient(client.id as string, {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                risk_tier: riskTier,
                notes: notes.trim() || null,
            });
            router.refresh();
        });
    }

    return (
        <div>
            <Link
                href="/app/admin/booking/clients"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
            >
                <ArrowLeft size={14} />
                Back to clients
            </Link>

            <PageHeader title={`${client.first_name} ${client.last_name}`} />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <StatsCard label="Total Bookings" value={bookings.length} icon="checkSquare" />
                <StatsCard label="Total Spend" value={formatPrice(totalSpend)} icon="creditCard" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Client details */}
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Client Details</h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">First Name</label>
                                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Last Name</label>
                                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Risk Tier</label>
                                <select value={riskTier} onChange={(e) => setRiskTier(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm">
                                    <option value="standard">Standard</option>
                                    <option value="vip">VIP</option>
                                    <option value="flagged">Flagged</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" rows={3} />
                        </div>
                        <button onClick={handleSave} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </Card>

                {/* Booking history */}
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Booking History</h3>
                    {bookings.length === 0 ? (
                        <p className="text-sm text-neutral-500 py-4 text-center">No bookings yet</p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {bookings.map(b => {
                                const status = b.status as string;
                                const items = b.booking_items as Record<string, unknown>[] | null;
                                return (
                                    <Link
                                        key={b.id as string}
                                        href={`/app/admin/booking/bookings/${b.id}`}
                                        className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                <span className="font-mono text-xs text-neutral-500">{formatBookingRef(b.id as string)}</span>
                                                {' '}
                                                {items?.map(i => i.service_name as string).join(', ')}
                                            </p>
                                            <p className="text-xs text-neutral-500">{formatDate(b.starts_at as string)} at {formatTime(b.starts_at as string)}</p>
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            <span className="text-sm font-medium">{formatPriceShort(b.total_price_pence as number)}</span>
                                            <Chip variant={(bookingStatusVariant[status] ?? 'default') as 'default'}>
                                                {bookingStatusLabel[status] ?? status}
                                            </Chip>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
