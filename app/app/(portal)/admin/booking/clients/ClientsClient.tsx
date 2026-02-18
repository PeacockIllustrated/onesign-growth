'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Chip, DataTable, EmptyState } from '@/app/app/components/ui';
import { formatDate } from '../_lib/formatters';

interface ClientsClientProps {
    clients: Record<string, unknown>[];
    tenantId: string;
}

const RISK_VARIANT: Record<string, string> = {
    vip: 'approved',
    flagged: 'review',
    standard: 'default',
};

export function ClientsClient({ clients }: ClientsClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search) return clients;
        const term = search.toLowerCase();
        return clients.filter(c => {
            const name = `${c.first_name} ${c.last_name}`.toLowerCase();
            const email = ((c.email as string) ?? '').toLowerCase();
            return name.includes(term) || email.includes(term);
        });
    }, [clients, search]);

    const columns = [
        {
            key: 'name',
            header: 'Name',
            render: (row: Record<string, unknown>) => (
                <span className="font-medium">{row.first_name as string} {row.last_name as string}</span>
            ),
        },
        { key: 'email', header: 'Email' },
        {
            key: 'phone',
            header: 'Phone',
            render: (row: Record<string, unknown>) => (
                <span>{(row.phone as string) || '-'}</span>
            ),
        },
        {
            key: 'risk_tier',
            header: 'Risk Tier',
            render: (row: Record<string, unknown>) => {
                const tier = (row.risk_tier as string) ?? 'standard';
                return (
                    <Chip variant={(RISK_VARIANT[tier] ?? 'default') as 'default'}>
                        {tier}
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
                title="Clients"
                description="View and manage booking clients"
            />

            <Card className="mb-4">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-sm border border-neutral-200 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm"
                />
            </Card>

            <Card>
                <DataTable
                    columns={columns}
                    data={filtered as Record<string, unknown>[]}
                    keyField="id"
                    onRowClick={(row) => router.push(`/app/admin/booking/clients/${row.id}`)}
                    emptyState={
                        <EmptyState
                            title="No clients found"
                            description={search ? 'Try a different search term.' : 'Clients will appear here after their first booking.'}
                        />
                    }
                />
            </Card>
        </div>
    );
}
