// =============================================================================
// Booking admin shared types
// =============================================================================

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    contact_email: string | null;
    contact_phone: string | null;
    address: Record<string, string> | null;
    status: 'setup' | 'active' | 'suspended';
    created_at: string;
}

export interface TenantBranding {
    id: string;
    tenant_id: string;
    logo_url: string | null;
    accent_colour: string;
    font_preset: string;
}

export interface TenantPolicies {
    id: string;
    tenant_id: string;
    cancellation_window_hours: number;
    cancellation_fee_percent: number;
    no_show_fee_percent: number;
    deposit_required: boolean;
    deposit_percent: number;
    deposit_min_booking_value: number | null;
    card_on_file_required: boolean;
    min_booking_notice_hours: number;
    max_booking_horizon_days: number;
    allow_guest_booking: boolean;
    require_intake_form: boolean;
}

export interface ServiceCategory {
    id: string;
    tenant_id: string;
    name: string;
    sort_order: number;
}

export interface Service {
    id: string;
    tenant_id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    duration_minutes: number;
    buffer_minutes: number;
    price_pence: number;
    deposit_override_percent: number | null;
    is_active: boolean;
    sort_order: number;
}

export interface ServiceAddon {
    id: string;
    tenant_id: string;
    service_id: string;
    name: string;
    duration_minutes: number;
    price_pence: number;
    is_active: boolean;
}

export interface StaffProfile {
    id: string;
    tenant_id: string;
    user_id: string | null;
    display_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    bio: string | null;
    role: 'owner' | 'manager' | 'staff' | 'reception';
    is_active: boolean;
    created_at: string;
}

export interface StaffAvailability {
    id: string;
    tenant_id: string;
    staff_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    location_id: string | null;
}

export interface StaffTimeOff {
    id: string;
    tenant_id: string;
    staff_id: string;
    start_date: string;
    end_date: string;
    reason: string | null;
    approved: boolean;
    created_at: string;
}

export interface Client {
    id: string;
    tenant_id: string;
    user_id: string | null;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    risk_tier: 'standard' | 'flagged' | 'vip';
    notes: string | null;
    created_at: string;
}

export interface Booking {
    id: string;
    tenant_id: string;
    client_id: string;
    staff_id: string;
    location_id: string | null;
    status: 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
    starts_at: string;
    ends_at: string;
    total_price_pence: number;
    deposit_amount_pence: number;
    notes: string | null;
    cancellation_reason: string | null;
    cancelled_at: string | null;
    cancelled_by: string | null;
    source: string;
    created_at: string;
}

export interface BookingItem {
    id: string;
    tenant_id: string;
    booking_id: string;
    service_id: string;
    service_name: string;
    duration_minutes: number;
    price_pence: number;
}

export interface BookingItemAddon {
    id: string;
    tenant_id: string;
    booking_item_id: string;
    addon_id: string;
    addon_name: string;
    duration_minutes: number;
    price_pence: number;
}

export interface StatusHistoryEntry {
    id: string;
    tenant_id: string;
    booking_id: string;
    old_status: string | null;
    new_status: string;
    changed_by: string | null;
    reason: string | null;
    created_at: string;
}

export interface MessageLog {
    id: string;
    tenant_id: string;
    booking_id: string | null;
    client_id: string | null;
    template_slug: string;
    channel: string;
    recipient: string;
    subject: string | null;
    status: string;
    created_at: string;
}

export interface MessageTemplate {
    id: string;
    tenant_id: string;
    slug: string;
    channel: string;
    subject: string | null;
    body: string;
    is_active: boolean;
}

export interface PaymentIntent {
    id: string;
    tenant_id: string;
    booking_id: string;
    client_id: string;
    type: string;
    amount_pence: number;
    status: string;
    stripe_payment_intent_id: string | null;
    created_at: string;
}

// Enriched types for list views
export interface BookingWithRelations extends Booking {
    client_name: string;
    client_email: string;
    staff_name: string;
    services: string[];
}

export interface ClientWithStats extends Client {
    booking_count: number;
    last_visit: string | null;
    total_spend_pence: number;
}

export interface StaffWithStats extends StaffProfile {
    booking_count_this_week: number;
    service_count: number;
}

// Status variant mapping for Chip component
export type BookingStatus = Booking['status'];

export const bookingStatusVariant: Record<string, string> = {
    confirmed: 'approved',
    completed: 'done',
    cancelled: 'default',
    no_show: 'default',
    rescheduled: 'scheduled',
};

export const bookingStatusLabel: Record<string, string> = {
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
    rescheduled: 'Rescheduled',
};

export const tenantStatusVariant: Record<string, string> = {
    setup: 'review',
    active: 'active',
    suspended: 'paused',
};
