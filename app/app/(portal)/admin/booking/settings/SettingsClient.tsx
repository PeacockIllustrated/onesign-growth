'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Chip, Modal } from '@/app/app/components/ui';
import { updateTenant, upsertBranding, upsertPolicies, updateMessageTemplate } from '../_lib/actions';

interface SettingsClientProps {
    tenant: Record<string, unknown>;
    policies: Record<string, unknown> | null;
    branding: Record<string, unknown> | null;
    templates: Record<string, unknown>[];
    tenantId: string;
}

const TABS = ['General', 'Policies', 'Branding', 'Messaging'] as const;

export function SettingsClient({ tenant, policies, branding, templates, tenantId }: SettingsClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<string>('General');
    const [saved, setSaved] = useState(false);

    // General
    const [name, setName] = useState(tenant.name as string);
    const [contactEmail, setContactEmail] = useState((tenant.contact_email as string) ?? '');
    const [contactPhone, setContactPhone] = useState((tenant.contact_phone as string) ?? '');
    const [timezone, setTimezone] = useState((tenant.timezone as string) ?? 'Europe/London');

    // Policies
    const [cancWindowHrs, setCancWindowHrs] = useState(policies?.cancellation_window_hours as number ?? 24);
    const [cancFee, setCancFee] = useState(policies?.cancellation_fee_percent as number ?? 0);
    const [noShowFee, setNoShowFee] = useState(policies?.no_show_fee_percent as number ?? 100);
    const [depositReq, setDepositReq] = useState(policies?.deposit_required as boolean ?? true);
    const [depositPct, setDepositPct] = useState(policies?.deposit_percent as number ?? 20);
    const [minNotice, setMinNotice] = useState(policies?.min_booking_notice_hours as number ?? 2);
    const [maxHorizon, setMaxHorizon] = useState(policies?.max_booking_horizon_days as number ?? 60);
    const [guestBooking, setGuestBooking] = useState(policies?.allow_guest_booking as boolean ?? true);

    // Branding
    const [accentColour, setAccentColour] = useState((branding?.accent_colour as string) ?? '#000000');
    const [fontPreset, setFontPreset] = useState((branding?.font_preset as string) ?? 'system');
    const [logoUrl, setLogoUrl] = useState((branding?.logo_url as string) ?? '');

    // Template editing
    const [editingTemplate, setEditingTemplate] = useState<Record<string, unknown> | null>(null);
    const [tplSubject, setTplSubject] = useState('');
    const [tplBody, setTplBody] = useState('');

    function showSaved() {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    function handleSaveGeneral() {
        startTransition(async () => {
            await updateTenant(tenantId, {
                name: name.trim(),
                contact_email: contactEmail.trim() || null,
                contact_phone: contactPhone.trim() || null,
                timezone,
            });
            showSaved();
            router.refresh();
        });
    }

    function handleSavePolicies() {
        startTransition(async () => {
            await upsertPolicies(tenantId, {
                cancellation_window_hours: cancWindowHrs,
                cancellation_fee_percent: cancFee,
                no_show_fee_percent: noShowFee,
                deposit_required: depositReq,
                deposit_percent: depositPct,
                min_booking_notice_hours: minNotice,
                max_booking_horizon_days: maxHorizon,
                allow_guest_booking: guestBooking,
            });
            showSaved();
            router.refresh();
        });
    }

    function handleSaveBranding() {
        startTransition(async () => {
            await upsertBranding(tenantId, {
                accent_colour: accentColour,
                font_preset: fontPreset,
                logo_url: logoUrl.trim() || null,
            });
            showSaved();
            router.refresh();
        });
    }

    function openTemplate(tpl: Record<string, unknown>) {
        setEditingTemplate(tpl);
        setTplSubject((tpl.subject as string) ?? '');
        setTplBody((tpl.body as string) ?? '');
    }

    function handleSaveTemplate() {
        if (!editingTemplate) return;
        startTransition(async () => {
            await updateMessageTemplate(editingTemplate.id as string, {
                subject: tplSubject.trim() || undefined,
                body: tplBody.trim() || undefined,
            });
            setEditingTemplate(null);
            showSaved();
            router.refresh();
        });
    }

    return (
        <div>
            <PageHeader title="Settings" description={`Configure ${tenant.name}`} />

            {saved && (
                <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-[var(--radius-sm)] text-sm text-green-700">
                    Settings saved successfully
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-neutral-200">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab
                                ? 'border-neutral-900 text-neutral-900'
                                : 'border-transparent text-neutral-500 hover:text-neutral-700'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* General */}
            {activeTab === 'General' && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">General Settings</h3>
                    <div className="space-y-3 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Business Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Slug</label>
                            <input type="text" value={tenant.slug as string} disabled
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm bg-neutral-50 text-neutral-500" />
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
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Timezone</label>
                            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm">
                                <option value="Europe/London">Europe/London</option>
                                <option value="Europe/Dublin">Europe/Dublin</option>
                                <option value="Europe/Edinburgh">Europe/Edinburgh</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                        <button onClick={handleSaveGeneral} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </Card>
            )}

            {/* Policies */}
            {activeTab === 'Policies' && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Booking Policies</h3>
                    <div className="space-y-3 max-w-lg">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Cancellation Window (hours)</label>
                                <input type="number" value={cancWindowHrs} onChange={(e) => setCancWindowHrs(Number(e.target.value))}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Cancellation Fee (%)</label>
                                <input type="number" value={cancFee} onChange={(e) => setCancFee(Number(e.target.value))}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} max={100} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">No-show Fee (%)</label>
                            <input type="number" value={noShowFee} onChange={(e) => setNoShowFee(Number(e.target.value))}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} max={100} />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={depositReq} onChange={(e) => setDepositReq(e.target.checked)} />
                            Require deposit
                        </label>
                        {depositReq && (
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Deposit (%)</label>
                                <input type="number" value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value))}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={1} max={100} />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Min Booking Notice (hours)</label>
                                <input type="number" value={minNotice} onChange={(e) => setMinNotice(Number(e.target.value))}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Max Booking Horizon (days)</label>
                                <input type="number" value={maxHorizon} onChange={(e) => setMaxHorizon(Number(e.target.value))}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={1} />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={guestBooking} onChange={(e) => setGuestBooking(e.target.checked)} />
                            Allow guest booking (no account required)
                        </label>
                        <button onClick={handleSavePolicies} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Saving...' : 'Save Policies'}
                        </button>
                    </div>
                </Card>
            )}

            {/* Branding */}
            {activeTab === 'Branding' && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Branding</h3>
                    <div className="space-y-3 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Accent Colour</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={accentColour} onChange={(e) => setAccentColour(e.target.value)}
                                    className="w-10 h-10 rounded border border-neutral-200 cursor-pointer" />
                                <input type="text" value={accentColour} onChange={(e) => setAccentColour(e.target.value)}
                                    className="border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm w-28" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Font Preset</label>
                            <div className="flex gap-3">
                                {['system', 'serif', 'mono'].map(f => (
                                    <label key={f} className="flex items-center gap-2 text-sm">
                                        <input type="radio" name="font" value={f} checked={fontPreset === f}
                                            onChange={() => setFontPreset(f)} />
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Logo URL</label>
                            <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                                placeholder="https://..." />
                        </div>
                        <button onClick={handleSaveBranding} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Saving...' : 'Save Branding'}
                        </button>
                    </div>
                </Card>
            )}

            {/* Messaging */}
            {activeTab === 'Messaging' && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Message Templates</h3>
                    {templates.length === 0 ? (
                        <p className="text-sm text-neutral-500 py-4">No templates configured. Templates are created when the tenant is activated.</p>
                    ) : (
                        <div className="space-y-2">
                            {templates.map(tpl => (
                                <button
                                    key={tpl.id as string}
                                    onClick={() => openTemplate(tpl)}
                                    className="w-full flex items-center justify-between p-3 rounded-[var(--radius-sm)] border border-neutral-100 hover:bg-neutral-50 transition-colors text-left"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{tpl.slug as string}</p>
                                        <p className="text-xs text-neutral-500">{tpl.channel as string}</p>
                                    </div>
                                    <Chip variant={(tpl.is_active as boolean) ? 'active' : 'paused'}>
                                        {(tpl.is_active as boolean) ? 'Active' : 'Inactive'}
                                    </Chip>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 p-3 bg-neutral-50 rounded-[var(--radius-sm)] text-xs text-neutral-600">
                        <p className="font-medium mb-1">Available variables:</p>
                        <p>{'{{client_name}}, {{booking_date}}, {{booking_time}}, {{service_name}}, {{staff_name}}, {{total_price}}, {{deposit_amount}}, {{cancellation_link}}'}</p>
                    </div>
                </Card>
            )}

            {/* Template edit modal */}
            <Modal open={!!editingTemplate} onClose={() => setEditingTemplate(null)} title={`Edit Template: ${editingTemplate?.slug ?? ''}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Subject</label>
                        <input type="text" value={tplSubject} onChange={(e) => setTplSubject(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Body</label>
                        <textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)}
                            className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm font-mono"
                            rows={8} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingTemplate(null)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleSaveTemplate} disabled={isPending} className="btn-primary text-sm">
                            {isPending ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
