import 'server-only';
import { createAdminClient } from '@/lib/supabase-admin';

// =============================================================================
// Tenant queries
// =============================================================================

export async function getAllTenants() {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_tenants')
        .select('*')
        .order('name', { ascending: true });
    return data ?? [];
}

export async function getTenantById(tenantId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
    return data;
}

export async function getActiveTenantCount() {
    const supabase = createAdminClient();
    const { count } = await supabase
        .from('booking_tenants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
    return count ?? 0;
}

// =============================================================================
// Booking queries
// =============================================================================

export async function getBookingsForTenant(
    tenantId: string,
    options?: {
        status?: string;
        staffId?: string;
        from?: string;
        to?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }
) {
    const supabase = createAdminClient();

    let query = supabase
        .from('booking_bookings')
        .select(`
            *,
            booking_clients!inner (first_name, last_name, email),
            booking_staff_profiles!inner (display_name),
            booking_items (service_name)
        `)
        .eq('tenant_id', tenantId)
        .order('starts_at', { ascending: false });

    if (options?.status) {
        query = query.eq('status', options.status);
    }
    if (options?.staffId) {
        query = query.eq('staff_id', options.staffId);
    }
    if (options?.from) {
        query = query.gte('starts_at', options.from);
    }
    if (options?.to) {
        query = query.lte('starts_at', options.to);
    }
    if (options?.limit) {
        query = query.limit(options.limit);
    }
    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options?.limit ?? 25) - 1);
    }

    const { data } = await query;
    return data ?? [];
}

export async function getBookingById(tenantId: string, bookingId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_bookings')
        .select(`
            *,
            booking_clients (id, first_name, last_name, email, phone, risk_tier, notes),
            booking_staff_profiles (id, display_name, email),
            booking_items (
                id, service_name, duration_minutes, price_pence,
                booking_item_addons (id, addon_name, duration_minutes, price_pence)
            )
        `)
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single();
    return data;
}

export async function getBookingStatusHistory(bookingId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_status_history')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });
    return data ?? [];
}

export async function getBookingMessageLogs(bookingId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_message_logs')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
    return data ?? [];
}

export async function getTodaysBookingCount(tenantId: string) {
    const supabase = createAdminClient();
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { count } = await supabase
        .from('booking_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('starts_at', startOfDay)
        .lt('starts_at', endOfDay)
        .in('status', ['confirmed', 'rescheduled']);

    return count ?? 0;
}

export async function getWeekRevenue(tenantId: string) {
    const supabase = createAdminClient();
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const { data } = await supabase
        .from('booking_bookings')
        .select('total_price_pence')
        .eq('tenant_id', tenantId)
        .gte('starts_at', startOfWeek.toISOString())
        .in('status', ['confirmed', 'completed', 'rescheduled']);

    return (data ?? []).reduce((sum, b) => sum + (b.total_price_pence ?? 0), 0);
}

// =============================================================================
// Client queries
// =============================================================================

export async function getClientsForTenant(tenantId: string, search?: string) {
    const supabase = createAdminClient();

    let query = supabase
        .from('booking_clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data } = await query;
    return data ?? [];
}

export async function getClientById(tenantId: string, clientId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_clients')
        .select('*')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single();
    return data;
}

export async function getClientBookings(tenantId: string, clientId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_bookings')
        .select(`
            *,
            booking_staff_profiles (display_name),
            booking_items (service_name, price_pence)
        `)
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('starts_at', { ascending: false });
    return data ?? [];
}

// =============================================================================
// Service queries
// =============================================================================

export async function getServicesForTenant(tenantId: string) {
    const supabase = createAdminClient();

    const [{ data: categories }, { data: services }, { data: addons }] = await Promise.all([
        supabase
            .from('booking_service_categories')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('sort_order', { ascending: true }),
        supabase
            .from('booking_services')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('sort_order', { ascending: true }),
        supabase
            .from('booking_service_addons')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('name', { ascending: true }),
    ]);

    return {
        categories: categories ?? [],
        services: services ?? [],
        addons: addons ?? [],
    };
}

export async function getStaffServices(tenantId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_staff_services')
        .select('staff_id, service_id')
        .eq('tenant_id', tenantId);
    return data ?? [];
}

// =============================================================================
// Staff queries
// =============================================================================

export async function getStaffForTenant(tenantId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_staff_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_name', { ascending: true });
    return data ?? [];
}

export async function getStaffById(tenantId: string, staffId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_staff_profiles')
        .select('*')
        .eq('id', staffId)
        .eq('tenant_id', tenantId)
        .single();
    return data;
}

export async function getStaffAvailability(tenantId: string, staffId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_staff_availability')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('staff_id', staffId)
        .order('day_of_week', { ascending: true });
    return data ?? [];
}

export async function getStaffTimeOff(tenantId: string, staffId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_staff_time_off')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('staff_id', staffId)
        .order('start_date', { ascending: false });
    return data ?? [];
}

export async function getStaffBookings(tenantId: string, staffId: string, limit = 20) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_bookings')
        .select(`
            *,
            booking_clients (first_name, last_name),
            booking_items (service_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('staff_id', staffId)
        .gte('starts_at', new Date().toISOString())
        .in('status', ['confirmed', 'rescheduled'])
        .order('starts_at', { ascending: true })
        .limit(limit);
    return data ?? [];
}

// =============================================================================
// Settings / config queries
// =============================================================================

export async function getTenantPolicies(tenantId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_tenant_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
    return data;
}

export async function getTenantBranding(tenantId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
    return data;
}

export async function getMessageTemplates(tenantId: string) {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('booking_message_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('slug', { ascending: true });
    return data ?? [];
}

// =============================================================================
// Calendar queries
// =============================================================================

export async function getBookingsForDateRange(
    tenantId: string,
    from: string,
    to: string,
    staffId?: string
) {
    const supabase = createAdminClient();

    let query = supabase
        .from('booking_bookings')
        .select(`
            *,
            booking_clients (first_name, last_name),
            booking_staff_profiles (display_name),
            booking_items (service_name)
        `)
        .eq('tenant_id', tenantId)
        .gte('starts_at', from)
        .lte('starts_at', to)
        .in('status', ['confirmed', 'rescheduled', 'completed']);

    if (staffId) {
        query = query.eq('staff_id', staffId);
    }

    const { data } = await query;
    return data ?? [];
}

export async function getTimeOffForDateRange(
    tenantId: string,
    from: string,
    to: string,
    staffId?: string
) {
    const supabase = createAdminClient();

    let query = supabase
        .from('booking_staff_time_off')
        .select('*, booking_staff_profiles (display_name)')
        .eq('tenant_id', tenantId)
        .lte('start_date', to)
        .gte('end_date', from)
        .eq('approved', true);

    if (staffId) {
        query = query.eq('staff_id', staffId);
    }

    const { data } = await query;
    return data ?? [];
}

// =============================================================================
// Reports queries
// =============================================================================

export async function getBookingStats(tenantId: string, from: string, to: string) {
    const supabase = createAdminClient();

    const { data: bookings } = await supabase
        .from('booking_bookings')
        .select('status, total_price_pence, starts_at, staff_id')
        .eq('tenant_id', tenantId)
        .gte('starts_at', from)
        .lte('starts_at', to);

    const all = bookings ?? [];
    const totalBookings = all.length;
    const totalRevenue = all
        .filter(b => ['confirmed', 'completed', 'rescheduled'].includes(b.status))
        .reduce((sum, b) => sum + (b.total_price_pence ?? 0), 0);
    const noShows = all.filter(b => b.status === 'no_show').length;
    const noShowRate = totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0;

    return { totalBookings, totalRevenue, noShows, noShowRate, bookings: all };
}

export async function getStaffUtilisation(tenantId: string, from: string, to: string) {
    const supabase = createAdminClient();

    // Get all staff
    const { data: staff } = await supabase
        .from('booking_staff_profiles')
        .select('id, display_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

    // Get availability
    const { data: availability } = await supabase
        .from('booking_staff_availability')
        .select('staff_id, start_time, end_time, day_of_week')
        .eq('tenant_id', tenantId);

    // Get bookings
    const { data: bookings } = await supabase
        .from('booking_bookings')
        .select('staff_id, starts_at, ends_at')
        .eq('tenant_id', tenantId)
        .gte('starts_at', from)
        .lte('starts_at', to)
        .in('status', ['confirmed', 'completed', 'rescheduled']);

    return {
        staff: staff ?? [],
        availability: availability ?? [],
        bookings: bookings ?? [],
    };
}
