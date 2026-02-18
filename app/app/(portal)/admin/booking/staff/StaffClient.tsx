'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Chip, DataTable, Modal, EmptyState } from '@/app/app/components/ui';
import { formatDate } from '../_lib/formatters';
import { createStaff } from '../_lib/actions';
import { Plus } from 'lucide-react';

interface StaffClientProps {
    staff: Record<string, unknown>[];
    tenantId: string;
}

export function StaffClient({ staff, tenantId }: StaffClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [modalOpen, setModalOpen] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('staff');
    const [bio, setBio] = useState('');

    function handleCreate() {
        if (!name.trim() || !email.trim()) return;
        startTransition(async () => {
            await createStaff(tenantId, {
                display_name: name.trim(),
                email: email.trim(),
                role,
                phone: phone.trim() || undefined,
                bio: bio.trim() || undefined,
            });
            setModalOpen(false);
            setName('');
            setEmail('');
            setPhone('');
            setRole('staff');
            setBio('');
            router.refresh();
        });
    }

    const columns = [
        {
            key: 'display_name',
            header: 'Name',
            render: (row: Record<string, unknown>) => (
                <span className="font-medium">{row.display_name as string}</span>
            ),
        },
        { key: 'email', header: 'Email' },
        {
            key: 'role',
            header: 'Role',
            render: (row: Record<string, unknown>) => (
                <Chip variant="default">{row.role as string}</Chip>
            ),
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (row: Record<string, unknown>) => (
                <Chip variant={(row.is_active as boolean) ? 'active' : 'paused'}>
                    {(row.is_active as boolean) ? 'Active' : 'Inactive'}
                </Chip>
            ),
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
                title="Staff"
                description="Manage team members and availability"
                action={
                    <button onClick={() => setModalOpen(true)} className="btn-primary text-sm flex items-center gap-1">
                        <Plus size={14} />
                        Add Staff
                    </button>
                }
            />

            <Card>
                <DataTable
                    columns={columns}
                    data={staff as Record<string, unknown>[]}
                    keyField="id"
                    onRowClick={(row) => router.push(`/app/admin/booking/staff/${row.id}`)}
                    emptyState={
                        <EmptyState
                            title="No staff members"
                            description="Add your first team member to start managing schedules."
                            action={
                                <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">
                                    Add Staff
                                </button>
                            }
                        />
                    }
                />
            </Card>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff Member">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Display Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                            placeholder="Full name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
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
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Bio</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" rows={2} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleCreate} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Creating...' : 'Add Staff'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
