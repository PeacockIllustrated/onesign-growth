'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Chip, Modal, EmptyState } from '@/app/app/components/ui';
import { formatPriceShort, formatMinutes } from '../_lib/formatters';
import {
    createCategory,
    updateCategory,
    deleteCategory,
    createService,
    updateService,
    createAddon,
    updateAddon,
} from '../_lib/actions';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface ServicesClientProps {
    categories: Record<string, unknown>[];
    services: Record<string, unknown>[];
    addons: Record<string, unknown>[];
    tenantId: string;
}

export function ServicesClient({ categories, services, addons, tenantId }: ServicesClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.map(c => c.id as string)));
    const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

    // Modals
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [serviceModalOpen, setServiceModalOpen] = useState(false);
    const [addonModalOpen, setAddonModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Record<string, unknown> | null>(null);

    // Category form
    const [catName, setCatName] = useState('');

    // Service form
    const [svcName, setSvcName] = useState('');
    const [svcDesc, setSvcDesc] = useState('');
    const [svcCategoryId, setSvcCategoryId] = useState('');
    const [svcDuration, setSvcDuration] = useState(60);
    const [svcBuffer, setSvcBuffer] = useState(0);
    const [svcPrice, setSvcPrice] = useState(0);

    // Addon form
    const [addonServiceId, setAddonServiceId] = useState('');
    const [addonName, setAddonName] = useState('');
    const [addonDuration, setAddonDuration] = useState(15);
    const [addonPrice, setAddonPrice] = useState(0);

    function toggleCategory(id: string) {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleServiceAddons(id: string) {
        setExpandedServices(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function handleCreateCategory() {
        if (!catName.trim()) return;
        startTransition(async () => {
            await createCategory(tenantId, catName.trim(), categories.length);
            setCatName('');
            setCatModalOpen(false);
            router.refresh();
        });
    }

    function openServiceModal(categoryId?: string) {
        setSvcName('');
        setSvcDesc('');
        setSvcCategoryId(categoryId ?? '');
        setSvcDuration(60);
        setSvcBuffer(0);
        setSvcPrice(0);
        setEditingService(null);
        setServiceModalOpen(true);
    }

    function openEditService(svc: Record<string, unknown>) {
        setEditingService(svc);
        setSvcName(svc.name as string);
        setSvcDesc((svc.description as string) ?? '');
        setSvcCategoryId((svc.category_id as string) ?? '');
        setSvcDuration(svc.duration_minutes as number);
        setSvcBuffer(svc.buffer_minutes as number);
        setSvcPrice(svc.price_pence as number);
        setServiceModalOpen(true);
    }

    function handleSaveService() {
        if (!svcName.trim()) return;
        startTransition(async () => {
            if (editingService) {
                await updateService(editingService.id as string, {
                    name: svcName.trim(),
                    description: svcDesc.trim() || null,
                    category_id: svcCategoryId || null,
                    duration_minutes: svcDuration,
                    buffer_minutes: svcBuffer,
                    price_pence: svcPrice,
                });
            } else {
                await createService(tenantId, {
                    name: svcName.trim(),
                    description: svcDesc.trim() || undefined,
                    category_id: svcCategoryId || null,
                    duration_minutes: svcDuration,
                    buffer_minutes: svcBuffer,
                    price_pence: svcPrice,
                });
            }
            setServiceModalOpen(false);
            router.refresh();
        });
    }

    function handleToggleActive(svcId: string, currentActive: boolean) {
        startTransition(async () => {
            await updateService(svcId, { is_active: !currentActive });
            router.refresh();
        });
    }

    function openAddonModal(serviceId: string) {
        setAddonServiceId(serviceId);
        setAddonName('');
        setAddonDuration(15);
        setAddonPrice(0);
        setAddonModalOpen(true);
    }

    function handleCreateAddon() {
        if (!addonName.trim()) return;
        startTransition(async () => {
            await createAddon(tenantId, {
                service_id: addonServiceId,
                name: addonName.trim(),
                duration_minutes: addonDuration,
                price_pence: addonPrice,
            });
            setAddonModalOpen(false);
            router.refresh();
        });
    }

    const uncategorised = services.filter(s => !s.category_id);

    function renderServiceRow(svc: Record<string, unknown>) {
        const svcAddons = addons.filter(a => a.service_id === svc.id);
        const isExpanded = expandedServices.has(svc.id as string);

        return (
            <div key={svc.id as string} className="border-b border-neutral-50 last:border-0">
                <div className="flex items-center gap-3 py-2 px-3 hover:bg-neutral-50 transition-colors">
                    {svcAddons.length > 0 && (
                        <button onClick={() => toggleServiceAddons(svc.id as string)} className="text-neutral-400">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}
                    {svcAddons.length === 0 && <div className="w-[14px]" />}
                    <button
                        onClick={() => openEditService(svc)}
                        className="flex-1 text-left text-sm font-medium text-neutral-900 hover:text-blue-600"
                    >
                        {svc.name as string}
                    </button>
                    <span className="text-xs text-neutral-500 w-16 text-right">{formatMinutes(svc.duration_minutes as number)}</span>
                    <span className="text-sm font-medium w-20 text-right">{formatPriceShort(svc.price_pence as number)}</span>
                    <span className="text-xs text-neutral-500 w-16 text-right">{(svc.buffer_minutes as number)}min buf</span>
                    <button
                        onClick={() => handleToggleActive(svc.id as string, svc.is_active as boolean)}
                        disabled={isPending}
                    >
                        <Chip variant={(svc.is_active as boolean) ? 'active' : 'paused'}>
                            {(svc.is_active as boolean) ? 'Active' : 'Inactive'}
                        </Chip>
                    </button>
                    <button
                        onClick={() => openAddonModal(svc.id as string)}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        + Addon
                    </button>
                </div>
                {isExpanded && svcAddons.length > 0 && (
                    <div className="pl-12 pb-2 space-y-1">
                        {svcAddons.map(addon => (
                            <div key={addon.id as string} className="flex items-center gap-3 text-sm text-neutral-600 py-1">
                                <span className="flex-1">+ {addon.name as string}</span>
                                <span className="text-xs w-16 text-right">{formatMinutes(addon.duration_minutes as number)}</span>
                                <span className="w-20 text-right">{formatPriceShort(addon.price_pence as number)}</span>
                                <Chip variant={(addon.is_active as boolean) ? 'active' : 'paused'}>
                                    {(addon.is_active as boolean) ? 'Active' : 'Off'}
                                </Chip>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Services"
                description="Manage service categories, services, and add-ons"
                action={
                    <div className="flex gap-2">
                        <button onClick={() => setCatModalOpen(true)} className="btn-secondary text-sm">
                            Add Category
                        </button>
                        <button onClick={() => openServiceModal()} className="btn-primary text-sm flex items-center gap-1">
                            <Plus size={14} />
                            Add Service
                        </button>
                    </div>
                }
            />

            {services.length === 0 ? (
                <Card>
                    <EmptyState
                        title="No services yet"
                        description="Add your first service to start accepting bookings."
                        action={
                            <button onClick={() => openServiceModal()} className="btn-primary text-sm">
                                Add Service
                            </button>
                        }
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {/* Categorised services */}
                    {categories.map(cat => {
                        const catServices = services.filter(s => s.category_id === cat.id);
                        const isExpanded = expandedCategories.has(cat.id as string);
                        return (
                            <Card key={cat.id as string}>
                                <button
                                    onClick={() => toggleCategory(cat.id as string)}
                                    className="flex items-center gap-2 w-full text-left mb-2"
                                >
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    <h3 className="text-sm font-semibold text-neutral-900">{cat.name as string}</h3>
                                    <span className="text-xs text-neutral-500">({catServices.length})</span>
                                </button>
                                {isExpanded && (
                                    <div>
                                        {catServices.length === 0 ? (
                                            <p className="text-sm text-neutral-500 py-2 pl-6">No services in this category</p>
                                        ) : (
                                            catServices.map(renderServiceRow)
                                        )}
                                        <button
                                            onClick={() => openServiceModal(cat.id as string)}
                                            className="mt-2 text-xs text-blue-600 hover:underline pl-6"
                                        >
                                            + Add service to {cat.name as string}
                                        </button>
                                    </div>
                                )}
                            </Card>
                        );
                    })}

                    {/* Uncategorised */}
                    {uncategorised.length > 0 && (
                        <Card>
                            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Uncategorised</h3>
                            {uncategorised.map(renderServiceRow)}
                        </Card>
                    )}
                </div>
            )}

            {/* Category modal */}
            <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Add Category">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={catName}
                            onChange={(e) => setCatName(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                            placeholder="e.g. Hair, Nails, Beauty"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setCatModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleCreateCategory} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Creating...' : 'Create Category'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Service modal */}
            <Modal open={serviceModalOpen} onClose={() => setServiceModalOpen(false)} title={editingService ? 'Edit Service' : 'Add Service'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                        <input type="text" value={svcName} onChange={(e) => setSvcName(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                        <textarea value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" rows={2} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                        <select value={svcCategoryId} onChange={(e) => setSvcCategoryId(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm">
                            <option value="">Uncategorised</option>
                            {categories.map(c => (
                                <option key={c.id as string} value={c.id as string}>{c.name as string}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Duration (min)</label>
                            <input type="number" value={svcDuration} onChange={(e) => setSvcDuration(Number(e.target.value))}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={5} step={5} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Buffer (min)</label>
                            <input type="number" value={svcBuffer} onChange={(e) => setSvcBuffer(Number(e.target.value))}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} step={5} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Price (pence)</label>
                            <input type="number" value={svcPrice} onChange={(e) => setSvcPrice(Number(e.target.value))}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} step={50} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setServiceModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleSaveService} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Addon modal */}
            <Modal open={addonModalOpen} onClose={() => setAddonModalOpen(false)} title="Add Addon">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                        <input type="text" value={addonName} onChange={(e) => setAddonName(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Duration (min)</label>
                            <input type="number" value={addonDuration} onChange={(e) => setAddonDuration(Number(e.target.value))}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={5} step={5} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Price (pence)</label>
                            <input type="number" value={addonPrice} onChange={(e) => setAddonPrice(Number(e.target.value))}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} step={50} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setAddonModalOpen(false)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleCreateAddon} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Creating...' : 'Create Addon'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
