'use server';

import { createAdminClient } from '@/lib/supabase-admin';

// =============================================================================
// Tenant actions
// =============================================================================

export async function createTenant(data: {
    name: string;
    slug: string;
    timezone: string;
    currency?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: Record<string, string>;
}) {
    const supabase = createAdminClient();
    const { data: tenant, error } = await supabase
        .from('booking_tenants')
        .insert({
            name: data.name,
            slug: data.slug,
            timezone: data.timezone,
            currency: data.currency ?? 'GBP',
            contact_email: data.contact_email ?? null,
            contact_phone: data.contact_phone ?? null,
            address: data.address ?? null,
            status: 'setup',
        })
        .select('id')
        .single();

    if (error) return { error: error.message };
    return { id: tenant.id };
}

export async function updateTenant(tenantId: string, data: Record<string, unknown>) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_tenants')
        .update(data)
        .eq('id', tenantId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function activateTenant(tenantId: string) {
    return updateTenant(tenantId, { status: 'active' });
}

// =============================================================================
// Branding actions
// =============================================================================

export async function upsertBranding(tenantId: string, data: {
    accent_colour?: string;
    font_preset?: string;
    logo_url?: string | null;
}) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_tenant_branding')
        .upsert({ tenant_id: tenantId, ...data }, { onConflict: 'tenant_id' });

    if (error) return { error: error.message };
    return { success: true };
}

// =============================================================================
// Policy actions
// =============================================================================

export async function upsertPolicies(tenantId: string, data: Record<string, unknown>) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_tenant_policies')
        .upsert({ tenant_id: tenantId, ...data }, { onConflict: 'tenant_id' });

    if (error) return { error: error.message };
    return { success: true };
}

// =============================================================================
// Service actions
// =============================================================================

export async function createCategory(tenantId: string, name: string, sortOrder: number) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('booking_service_categories')
        .insert({ tenant_id: tenantId, name, sort_order: sortOrder })
        .select('id')
        .single();

    if (error) return { error: error.message };
    return { id: data.id };
}

export async function updateCategory(categoryId: string, name: string) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_service_categories')
        .update({ name })
        .eq('id', categoryId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteCategory(categoryId: string) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_service_categories')
        .delete()
        .eq('id', categoryId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function createService(tenantId: string, data: {
    category_id: string | null;
    name: string;
    description?: string;
    duration_minutes: number;
    buffer_minutes: number;
    price_pence: number;
    deposit_override_percent?: number | null;
    sort_order?: number;
}) {
    const supabase = createAdminClient();
    const { data: service, error } = await supabase
        .from('booking_services')
        .insert({
            tenant_id: tenantId,
            is_active: true,
            ...data,
        })
        .select('id')
        .single();

    if (error) return { error: error.message };
    return { id: service.id };
}

export async function updateService(serviceId: string, data: Record<string, unknown>) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_services')
        .update(data)
        .eq('id', serviceId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function createAddon(tenantId: string, data: {
    service_id: string;
    name: string;
    duration_minutes: number;
    price_pence: number;
}) {
    const supabase = createAdminClient();
    const { data: addon, error } = await supabase
        .from('booking_service_addons')
        .insert({ tenant_id: tenantId, is_active: true, ...data })
        .select('id')
        .single();

    if (error) return { error: error.message };
    return { id: addon.id };
}

export async function updateAddon(addonId: string, data: Record<string, unknown>) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_service_addons')
        .update(data)
        .eq('id', addonId);

    if (error) return { error: error.message };
    return { success: true };
}

// =============================================================================
// Staff actions
// =============================================================================

export async function createStaff(tenantId: string, data: {
    display_name: string;
    email: string;
    role: string;
    bio?: string;
    phone?: string;
}) {
    const supabase = createAdminClient();
    const { data: staff, error } = await supabase
        .from('booking_staff_profiles')
        .insert({ tenant_id: tenantId, is_active: true, ...data })
        .select('id')
        .single();

    if (error) return { error: error.message };
    return { id: staff.id };
}

export async function updateStaff(staffId: string, data: Record<string, unknown>) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_staff_profiles')
        .update(data)
        .eq('id', staffId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function setStaffAvailability(tenantId: string, staffId: string, rows: {
    day_of_week: number;
    start_time: string;
    end_time: string;
}[]) {
    const supabase = createAdminClient();

    // Delete existing availability
    await supabase
        .from('booking_staff_availability')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('staff_id', staffId);

    if (rows.length === 0) return { success: true };

    // Insert new rows
    const { error } = await supabase
        .from('booking_staff_availability')
        .insert(rows.map(r => ({ tenant_id: tenantId, staff_id: staffId, ...r })));

    if (error) return { error: error.message };
    return { success: true };
}

export async function setStaffServices(tenantId: string, staffId: string, serviceIds: string[]) {
    const supabase = createAdminClient();

    // Delete existing
    await supabase
        .from('booking_staff_services')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('staff_id', staffId);

    if (serviceIds.length === 0) return { success: true };

    const { error } = await supabase
        .from('booking_staff_services')
        .insert(serviceIds.map(sid => ({ tenant_id: tenantId, staff_id: staffId, service_id: sid })));

    if (error) return { error: error.message };
    return { success: true };
}

export async function createTimeOff(tenantId: string, staffId: string, data: {
    start_date: string;
    end_date: string;
    reason?: string;
}) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_staff_time_off')
        .insert({
            tenant_id: tenantId,
            staff_id: staffId,
            approved: true,
            ...data,
        });

    if (error) return { error: error.message };
    return { success: true };
}

// =============================================================================
// Booking actions (admin-side)
// =============================================================================

export async function cancelBookingAdmin(tenantId: string, bookingId: string, reason?: string) {
    const supabase = createAdminClient();

    const { data: booking } = await supabase
        .from('booking_bookings')
        .select('status')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();

    if (!booking) return { error: 'Booking not found' };

    const { error } = await supabase
        .from('booking_bookings')
        .update({
            status: 'cancelled',
            cancellation_reason: reason || null,
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'staff',
        })
        .eq('id', bookingId);

    if (error) return { error: error.message };

    // Add status history
    await supabase.from('booking_status_history').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        old_status: booking.status,
        new_status: 'cancelled',
        reason: reason || 'Cancelled by admin',
    });

    return { success: true };
}

export async function markNoShowAdmin(tenantId: string, bookingId: string) {
    const supabase = createAdminClient();

    const { data: booking } = await supabase
        .from('booking_bookings')
        .select('status')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();

    if (!booking) return { error: 'Booking not found' };

    const { error } = await supabase
        .from('booking_bookings')
        .update({ status: 'no_show' })
        .eq('id', bookingId);

    if (error) return { error: error.message };

    await supabase.from('booking_status_history').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        old_status: booking.status,
        new_status: 'no_show',
        reason: 'Marked as no-show by admin',
    });

    return { success: true };
}

export async function completeBookingAdmin(tenantId: string, bookingId: string) {
    const supabase = createAdminClient();

    const { data: booking } = await supabase
        .from('booking_bookings')
        .select('status')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();

    if (!booking) return { error: 'Booking not found' };

    const { error } = await supabase
        .from('booking_bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

    if (error) return { error: error.message };

    await supabase.from('booking_status_history').insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        old_status: booking.status,
        new_status: 'completed',
        reason: 'Marked as completed by admin',
    });

    return { success: true };
}

// =============================================================================
// Client actions
// =============================================================================

export async function updateClient(clientId: string, data: Record<string, unknown>) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_clients')
        .update(data)
        .eq('id', clientId);

    if (error) return { error: error.message };
    return { success: true };
}

// =============================================================================
// Messaging actions
// =============================================================================

export async function updateMessageTemplate(templateId: string, data: {
    subject?: string;
    body?: string;
    is_active?: boolean;
}) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('booking_message_templates')
        .update(data)
        .eq('id', templateId);

    if (error) return { error: error.message };
    return { success: true };
}

// =============================================================================
// Calendar actions
// =============================================================================

export async function fetchCalendarBookings(
    tenantId: string,
    from: string,
    to: string,
    staffId?: string
) {
    const { getBookingsForDateRange } = await import('./queries');
    return getBookingsForDateRange(tenantId, from, to, staffId);
}

// =============================================================================
// Reports actions
// =============================================================================

export async function fetchBookingStats(
    tenantId: string,
    from: string,
    to: string
) {
    const { getBookingStats } = await import('./queries');
    return getBookingStats(tenantId, from, to);
}

export async function fetchStaffUtilisation(
    tenantId: string,
    from: string,
    to: string
) {
    const { getStaffUtilisation } = await import('./queries');
    return getStaffUtilisation(tenantId, from, to);
}

export async function fetchBookingsForExport(
    tenantId: string,
    from: string,
    to: string
) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_bookings')
        .select(`
            id, status, starts_at, ends_at, total_price_pence, source, created_at,
            booking_clients (first_name, last_name, email),
            booking_staff_profiles (display_name),
            booking_items (service_name, price_pence)
        `)
        .eq('tenant_id', tenantId)
        .gte('starts_at', from)
        .lte('starts_at', to)
        .order('starts_at', { ascending: false });

    return data ?? [];
}
