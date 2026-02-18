'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, Card, Chip } from '@/app/app/components/ui';
import { formatPriceShort, formatMinutes } from '../../_lib/formatters';
import {
    updateTenant,
    activateTenant,
    upsertBranding,
    upsertPolicies,
    createCategory,
    createService,
    createStaff,
} from '../../_lib/actions';
import { ArrowLeft, Check, Circle } from 'lucide-react';

interface SetupWizardClientProps {
    tenant: Record<string, unknown>;
    policies: Record<string, unknown> | null;
    branding: Record<string, unknown> | null;
    categories: Record<string, unknown>[];
    services: Record<string, unknown>[];
    addons: Record<string, unknown>[];
    staff: Record<string, unknown>[];
    templates: Record<string, unknown>[];
}

const STEPS = [
    { num: 1, label: 'Basics' },
    { num: 2, label: 'Branding' },
    { num: 3, label: 'Services' },
    { num: 4, label: 'Staff' },
    { num: 5, label: 'Policies' },
    { num: 6, label: 'Payments' },
    { num: 7, label: 'Messaging' },
    { num: 8, label: 'Go Live' },
];

export function SetupWizardClient({
    tenant,
    policies,
    branding,
    categories,
    services,
    staff,
    templates,
}: SetupWizardClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [step, setStep] = useState(1);
    const [saved, setSaved] = useState(false);
    const tenantId = tenant.id as string;

    // Step 1: Basics
    const [name, setName] = useState(tenant.name as string);
    const [contactEmail, setContactEmail] = useState((tenant.contact_email as string) ?? '');
    const [contactPhone, setContactPhone] = useState((tenant.contact_phone as string) ?? '');
    const [timezone, setTimezone] = useState((tenant.timezone as string) ?? 'Europe/London');

    // Step 2: Branding
    const [accentColour, setAccentColour] = useState((branding?.accent_colour as string) ?? '#000000');
    const [fontPreset, setFontPreset] = useState((branding?.font_preset as string) ?? 'system');
    const [logoUrl, setLogoUrl] = useState((branding?.logo_url as string) ?? '');

    // Step 3: Services - inline add form
    const [newCatName, setNewCatName] = useState('');
    const [newSvcName, setNewSvcName] = useState('');
    const [newSvcDuration, setNewSvcDuration] = useState(60);
    const [newSvcPrice, setNewSvcPrice] = useState(3000);
    const [newSvcCatId, setNewSvcCatId] = useState('');

    // Step 4: Staff - inline add form
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffEmail, setNewStaffEmail] = useState('');
    const [newStaffRole, setNewStaffRole] = useState('staff');

    // Step 5: Policies
    const [cancWindowHrs, setCancWindowHrs] = useState(policies?.cancellation_window_hours as number ?? 24);
    const [cancFee, setCancFee] = useState(policies?.cancellation_fee_percent as number ?? 0);
    const [noShowFee, setNoShowFee] = useState(policies?.no_show_fee_percent as number ?? 100);
    const [depositReq, setDepositReq] = useState(policies?.deposit_required as boolean ?? true);
    const [depositPct, setDepositPct] = useState(policies?.deposit_percent as number ?? 20);
    const [minNotice, setMinNotice] = useState(policies?.min_booking_notice_hours as number ?? 2);
    const [maxHorizon, setMaxHorizon] = useState(policies?.max_booking_horizon_days as number ?? 60);
    const [guestBooking, setGuestBooking] = useState(policies?.allow_guest_booking as boolean ?? true);

    function showSaved() {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    function handleSaveBasics() {
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

    function handleAddCategory() {
        if (!newCatName.trim()) return;
        startTransition(async () => {
            await createCategory(tenantId, newCatName.trim(), categories.length);
            setNewCatName('');
            showSaved();
            router.refresh();
        });
    }

    function handleAddService() {
        if (!newSvcName.trim()) return;
        startTransition(async () => {
            await createService(tenantId, {
                name: newSvcName.trim(),
                category_id: newSvcCatId || null,
                duration_minutes: newSvcDuration,
                buffer_minutes: 0,
                price_pence: newSvcPrice,
            });
            setNewSvcName('');
            showSaved();
            router.refresh();
        });
    }

    function handleAddStaff() {
        if (!newStaffName.trim() || !newStaffEmail.trim()) return;
        startTransition(async () => {
            await createStaff(tenantId, {
                display_name: newStaffName.trim(),
                email: newStaffEmail.trim(),
                role: newStaffRole,
            });
            setNewStaffName('');
            setNewStaffEmail('');
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

    function handleActivate() {
        startTransition(async () => {
            await activateTenant(tenantId);
            router.refresh();
            router.push('/app/admin/booking/launchpad');
        });
    }

    // Go Live checklist
    const hasBasics = !!(tenant.name);
    const hasBranding = !!branding;
    const hasServices = services.length > 0;
    const hasStaff = staff.length > 0;
    const hasPolicies = !!policies;
    const canActivate = hasBasics && hasServices && hasStaff;
    const isActive = tenant.status === 'active';

    return (
        <div>
            <Link
                href="/app/admin/booking/launchpad"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-4"
            >
                <ArrowLeft size={14} />
                Back to launchpad
            </Link>

            <PageHeader
                title={`Set Up: ${tenant.name}`}
                description={isActive ? 'This tenant is live' : 'Complete the setup steps to go live'}
                action={
                    <Chip variant={isActive ? 'active' : 'review'}>
                        {isActive ? 'Active' : 'Setup'}
                    </Chip>
                }
            />

            {saved && (
                <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-[var(--radius-sm)] text-sm text-green-700">
                    Saved successfully
                </div>
            )}

            {/* Step indicator */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
                {STEPS.map(s => (
                    <button
                        key={s.num}
                        onClick={() => setStep(s.num)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium whitespace-nowrap transition-colors ${
                            step === s.num
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                    >
                        <span className="text-xs">{s.num}</span>
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Business Details</h3>
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
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSaveBasics} disabled={isPending} className="btn-primary text-sm">
                                {isPending ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setStep(2)} className="btn-secondary text-sm">Next</button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 2: Branding */}
            {step === 2 && (
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
                        <div className="flex gap-2">
                            <button onClick={() => setStep(1)} className="btn-secondary text-sm">Back</button>
                            <button onClick={handleSaveBranding} disabled={isPending} className="btn-primary text-sm">
                                {isPending ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setStep(3)} className="btn-secondary text-sm">Next</button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 3: Services */}
            {step === 3 && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Services</h3>
                    {/* Existing services */}
                    {services.length > 0 && (
                        <div className="mb-4 space-y-1">
                            {services.map(s => (
                                <div key={s.id as string} className="flex items-center justify-between text-sm py-1 border-b border-neutral-50">
                                    <span className="font-medium">{s.name as string}</span>
                                    <span className="text-neutral-500">{formatMinutes(s.duration_minutes as number)} - {formatPriceShort(s.price_pence as number)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add category */}
                    <div className="mb-4 p-3 bg-neutral-50 rounded-[var(--radius-sm)]">
                        <p className="text-xs font-medium text-neutral-600 mb-2">Add Category</p>
                        <div className="flex gap-2">
                            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                                className="flex-1 border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                                placeholder="Category name" />
                            <button onClick={handleAddCategory} disabled={isPending} className="btn-secondary text-sm">Add</button>
                        </div>
                    </div>

                    {/* Add service */}
                    <div className="p-3 bg-neutral-50 rounded-[var(--radius-sm)]">
                        <p className="text-xs font-medium text-neutral-600 mb-2">Add Service</p>
                        <div className="space-y-2">
                            <input type="text" value={newSvcName} onChange={(e) => setNewSvcName(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                                placeholder="Service name" />
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs text-neutral-500">Category</label>
                                    <select value={newSvcCatId} onChange={(e) => setNewSvcCatId(e.target.value)}
                                        className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm">
                                        <option value="">None</option>
                                        {categories.map(c => (
                                            <option key={c.id as string} value={c.id as string}>{c.name as string}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-500">Duration (min)</label>
                                    <input type="number" value={newSvcDuration} onChange={(e) => setNewSvcDuration(Number(e.target.value))}
                                        className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={5} step={5} />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-500">Price (pence)</label>
                                    <input type="number" value={newSvcPrice} onChange={(e) => setNewSvcPrice(Number(e.target.value))}
                                        className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} step={50} />
                                </div>
                            </div>
                            <button onClick={handleAddService} disabled={isPending} className="btn-primary text-sm">
                                {isPending ? 'Adding...' : 'Add Service'}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setStep(2)} className="btn-secondary text-sm">Back</button>
                        <button onClick={() => setStep(4)} className="btn-secondary text-sm">Next</button>
                    </div>
                </Card>
            )}

            {/* Step 4: Staff */}
            {step === 4 && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Staff</h3>
                    {staff.length > 0 && (
                        <div className="mb-4 space-y-1">
                            {staff.map(s => (
                                <div key={s.id as string} className="flex items-center justify-between text-sm py-1 border-b border-neutral-50">
                                    <span className="font-medium">{s.display_name as string}</span>
                                    <Chip variant="default">{s.role as string}</Chip>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="p-3 bg-neutral-50 rounded-[var(--radius-sm)]">
                        <p className="text-xs font-medium text-neutral-600 mb-2">Add Staff Member</p>
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)}
                                    className="border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                                    placeholder="Display name" />
                                <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)}
                                    className="border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm"
                                    placeholder="Email" />
                            </div>
                            <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)}
                                className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm">
                                <option value="owner">Owner</option>
                                <option value="manager">Manager</option>
                                <option value="staff">Staff</option>
                                <option value="reception">Reception</option>
                            </select>
                            <button onClick={handleAddStaff} disabled={isPending} className="btn-primary text-sm">
                                {isPending ? 'Adding...' : 'Add Staff'}
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-neutral-500 mt-3">Working hours can be configured on the staff profile page after setup.</p>

                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setStep(3)} className="btn-secondary text-sm">Back</button>
                        <button onClick={() => setStep(5)} className="btn-secondary text-sm">Next</button>
                    </div>
                </Card>
            )}

            {/* Step 5: Policies */}
            {step === 5 && (
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
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Min Notice (hours)</label>
                                <input type="number" value={minNotice} onChange={(e) => setMinNotice(Number(e.target.value))}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={0} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">Max Horizon (days)</label>
                                <input type="number" value={maxHorizon} onChange={(e) => setMaxHorizon(Number(e.target.value))}
                                    className="w-full border border-neutral-200 rounded-[var(--radius-sm)] p-2 text-sm" min={1} />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={guestBooking} onChange={(e) => setGuestBooking(e.target.checked)} />
                            Allow guest booking
                        </label>
                        <div className="flex gap-2">
                            <button onClick={() => setStep(4)} className="btn-secondary text-sm">Back</button>
                            <button onClick={handleSavePolicies} disabled={isPending} className="btn-primary text-sm">
                                {isPending ? 'Saving...' : 'Save Policies'}
                            </button>
                            <button onClick={() => setStep(6)} className="btn-secondary text-sm">Next</button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 6: Payments */}
            {step === 6 && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Payments</h3>
                    <div className="p-6 border border-dashed border-neutral-200 rounded-[var(--radius-sm)] text-center">
                        <Chip variant="review">Not Connected</Chip>
                        <p className="text-sm text-neutral-600 mt-3">
                            Stripe Connect integration is required to accept payments.
                        </p>
                        <p className="text-xs text-neutral-500 mt-2">
                            This will be configured in a future update. Bookings can still be taken without payment processing.
                        </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setStep(5)} className="btn-secondary text-sm">Back</button>
                        <button onClick={() => setStep(7)} className="btn-secondary text-sm">Next</button>
                    </div>
                </Card>
            )}

            {/* Step 7: Messaging */}
            {step === 7 && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">Messaging</h3>
                    {templates.length === 0 ? (
                        <div className="p-6 border border-dashed border-neutral-200 rounded-[var(--radius-sm)] text-center">
                            <p className="text-sm text-neutral-600">
                                Default message templates will be available once the tenant is activated.
                            </p>
                            <p className="text-xs text-neutral-500 mt-2">
                                Templates can be customised on the Settings page after setup.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {templates.map(tpl => (
                                <div key={tpl.id as string} className="flex items-center justify-between p-2 border-b border-neutral-50">
                                    <div>
                                        <p className="text-sm font-medium">{tpl.slug as string}</p>
                                        <p className="text-xs text-neutral-500">{tpl.channel as string}</p>
                                    </div>
                                    <Chip variant={(tpl.is_active as boolean) ? 'active' : 'paused'}>
                                        {(tpl.is_active as boolean) ? 'Active' : 'Inactive'}
                                    </Chip>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setStep(6)} className="btn-secondary text-sm">Back</button>
                        <button onClick={() => setStep(8)} className="btn-secondary text-sm">Next</button>
                    </div>
                </Card>
            )}

            {/* Step 8: Go Live */}
            {step === 8 && (
                <Card>
                    <h3 className="text-sm font-semibold text-neutral-900 mb-4">Go Live Checklist</h3>
                    <div className="space-y-3 mb-6">
                        {[
                            { label: 'Business details configured', done: hasBasics },
                            { label: 'Branding set up', done: hasBranding },
                            { label: 'At least one service created', done: hasServices },
                            { label: 'At least one staff member added', done: hasStaff },
                            { label: 'Policies configured', done: hasPolicies },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-3 text-sm">
                                {item.done ? (
                                    <Check size={18} className="text-green-600" />
                                ) : (
                                    <Circle size={18} className="text-neutral-300" />
                                )}
                                <span className={item.done ? 'text-neutral-900' : 'text-neutral-500'}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {isActive ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-[var(--radius-sm)]">
                            <p className="text-sm text-green-700 font-medium">This tenant is already active and accepting bookings.</p>
                        </div>
                    ) : (
                        <div>
                            {!canActivate && (
                                <p className="text-sm text-amber-600 mb-3">
                                    Complete the required steps (basics, at least 1 service, at least 1 staff) before activating.
                                </p>
                            )}
                            <div className="flex gap-2">
                                <button onClick={() => setStep(7)} className="btn-secondary text-sm">Back</button>
                                <button
                                    onClick={handleActivate}
                                    disabled={isPending || !canActivate}
                                    className="btn-primary text-sm"
                                >
                                    {isPending ? 'Activating...' : 'Activate Tenant'}
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
