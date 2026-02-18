'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Chip, DataTable, Modal, EmptyState } from '@/app/app/components/ui';
import { formatDate } from '../_lib/formatters';
import { tenantStatusVariant } from '../_lib/types';
import { createTenant } from '../_lib/actions';
import { Plus } from 'lucide-react';

interface LaunchpadClientProps {
    tenants: Record<string, unknown>[];
}

export function LaunchpadClient({ tenants }: LaunchpadClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [modalOpen, setModalOpen] = useState(false);

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [timezone, setTimezone] = useState('Europe/London');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    function handleNameChange(val: string) {
        setName(val);
        // Auto-generate slug from name
        setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }

    function handleCreate() {
        if (!name.trim() || !slug.trim()) return;
        startTransition(async () => {
            const result = await createTenant({
                name: name.trim(),
                slug: slug.trim(),
                timezone,
                contact_email: contactEmail.trim() || undefined,
                contact_phone: contactPhone.trim() || undefined,
            });
            if ('id' in result) {
                setModalOpen(false);
                router.push(`/app/admin/booking/launchpad/${result.id}`);
            }
        });
    }

    const columns = [
        {
            key: 'name',
            header: 'Name',
            render: (row: Record<string, unknown>) => (
                <span className="font-medium">{row.name as string}</span>
            ),
        },
        {
            key: 'slug',
            header: 'Slug',
            render: (row: Record<string, unknown>) => (
                <span className="font-mono text-xs text-neutral-500">{row.slug as string}</span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: Record<string, unknown>) => {
                const status = row.status as string;
                return (
                    <Chip variant={(tenantStatusVariant[status] ?? 'default') as 'default'}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Chip>
                );
            },
        },
        {
            key: 'created_at',
            header: 'Created',
            render: (row: Record<string, unknown>) => (
                <span className="text-xs text-neutral-500">{formatDate(row.created_at as string)}</span>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Launchpad"
                description="Manage booking tenants"
                action={
                    <button onClick={() => setModalOpen(true)} className="btn-primary text-sm flex items-center gap-1">
                        <Plus size={14} />
                        New Tenant
                    </button>
                }
            />

            <Card>
                <DataTable
                    columns={columns}
                    data={tenants as Record<string, unknown>[]}
                    keyField="id"
                    onRowClick={(row) => router.push(`/app/admin/booking/launchpad/${row.id}`)}
                    emptyState={
                        <EmptyState
                            title="No tenants yet"
                            description="Create your first tenant to get started with Booking OS."
                            action={
                                <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">
                                    Create Tenant
                                </button>
                            }
                        />
                    }
                />
            </Card>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Tenant">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Business Name</label>
                        <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                            placeholder="e.g. Luxe Nails Studio" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Slug</label>
                        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm font-mono"
                            placeholder="luxe-nails-studio" />
                        <p className="text-xs text-neutral-500 mt-1">Used in the booking URL</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Timezone</label>
                        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm">
                            <option value="Europe/London">Europe/London</option>
                            <option value="Europe/Dublin">Europe/Dublin</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Contact Email</label>
                            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Contact Phone</label>
                            <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleCreate} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Creating...' : 'Create Tenant'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
