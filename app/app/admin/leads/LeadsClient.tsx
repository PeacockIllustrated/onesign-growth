'use client';

import { useState } from 'react';
import { type MarketingLead } from '@/lib/supabase';
import { Card, Chip } from '../../components/ui';
import { LeadDetailModal } from './LeadDetailModal';
import { ConvertLeadWizard } from './ConvertLeadWizard';
import { DIGITAL_PACKAGES } from '@/lib/offers/onesignDigital';
import { useRouter } from 'next/navigation';

interface LeadsClientProps {
    initialLeads: MarketingLead[];
}

const statusFilters = ['all', 'new', 'contacted', 'qualified', 'converted', 'lost'] as const;
type StatusFilter = typeof statusFilters[number];

const statusVariants: Record<string, 'default' | 'draft' | 'review' | 'approved' | 'done'> = {
    new: 'draft',
    contacted: 'review',
    qualified: 'review',
    converted: 'done',
    lost: 'default',
};

export function LeadsClient({ initialLeads }: LeadsClientProps) {
    const router = useRouter();
    const [leads, setLeads] = useState(initialLeads);
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);

    const filteredLeads = filter === 'all'
        ? leads
        : leads.filter(l => l.status === filter);

    function handleStatusChange(leadId: string, newStatus: string) {
        setLeads(prev => prev.map(l =>
            l.id === leadId ? { ...l, status: newStatus } : l
        ));
        if (selectedLead?.id === leadId) {
            setSelectedLead({ ...selectedLead, status: newStatus });
        }
    }

    function handleOpenConvert(lead: MarketingLead) {
        setSelectedLead(lead);
        setDetailOpen(false);
        setWizardOpen(true);
    }

    function handleConvertSuccess(orgId: string) {
        router.refresh();
        setWizardOpen(false);
    }

    function getPackageName(key?: string) {
        if (!key) return '—';
        const pkg = DIGITAL_PACKAGES.find(p => p.id === key);
        return pkg?.name || key;
    }

    return (
        <>
            {/* Filter chips */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {statusFilters.map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`
                            px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                            ${filter === s
                                ? 'bg-black text-white'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}
                        `}
                    >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                        {s !== 'all' && (
                            <span className="ml-1 opacity-60">
                                ({leads.filter(l => l.status === s).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Leads Table */}
            <Card>
                {filteredLeads.length === 0 ? (
                    <p className="text-sm text-neutral-500 py-8 text-center">No leads found</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Company</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Contact</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Package</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredLeads.map(lead => (
                                    <tr
                                        key={lead.id}
                                        onClick={() => {
                                            setSelectedLead(lead);
                                            setDetailOpen(true);
                                        }}
                                        className="cursor-pointer hover:bg-neutral-50 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-neutral-900">{lead.company_name}</div>
                                            <div className="text-xs text-neutral-500">{lead.industry_type || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-neutral-900">{lead.contact_name}</div>
                                            <div className="text-xs text-neutral-500">{lead.contact_email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium">{getPackageName(lead.package_key)}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Chip variant={statusVariants[lead.status || 'new'] || 'default'}>
                                                {lead.status || 'new'}
                                            </Chip>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-500">
                                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-GB') : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Detail Modal */}
            <LeadDetailModal
                lead={selectedLead}
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                onStatusChange={handleStatusChange}
                onConvert={handleOpenConvert}
            />

            {/* Convert Wizard */}
            <ConvertLeadWizard
                lead={selectedLead}
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                onSuccess={handleConvertSuccess}
            />
        </>
    );
}
