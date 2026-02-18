// =============================================================================
// Booking admin formatting utilities
// =============================================================================

/**
 * Format pence as GBP string (e.g. 2500 -> "£25.00")
 */
export function formatPrice(pence: number, currency = 'GBP'): string {
    const pounds = pence / 100;
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
    }).format(pounds);
}

/**
 * Format pence as short GBP (e.g. 2500 -> "£25", 2550 -> "£25.50")
 */
export function formatPriceShort(pence: number, currency = 'GBP'): string {
    const pounds = pence / 100;
    if (pounds === Math.floor(pounds)) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
        }).format(pounds);
    }
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
    }).format(pounds);
}

/**
 * Format minutes as human-readable duration (e.g. 90 -> "1h 30min")
 */
export function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Format ISO date as readable date (e.g. "Mon 23 Jun 2026")
 */
export function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format ISO date as short date (e.g. "23 Jun")
 */
export function formatDateShort(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
    });
}

/**
 * Format ISO date as time (e.g. "14:30")
 */
export function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format booking ref (first 8 chars of UUID, uppercase)
 */
export function formatBookingRef(id: string): string {
    return id.slice(0, 8).toUpperCase();
}

/**
 * Day of week names (0 = Monday)
 */
export const DAY_NAMES = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

export const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
