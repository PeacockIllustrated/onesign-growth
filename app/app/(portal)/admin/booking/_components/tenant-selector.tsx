'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: string;
}

interface TenantSelectorProps {
    tenants: Tenant[];
    activeTenantId: string;
}

const STATUS_DOT: Record<string, string> = {
    active: 'bg-green-500',
    setup: 'bg-yellow-400',
    suspended: 'bg-red-400',
};

export function TenantSelector({ tenants, activeTenantId }: TenantSelectorProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleChange = useCallback(
        (tenantId: string) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tenant', tenantId);
            router.push(`${pathname}?${params.toString()}`);
        },
        [router, pathname, searchParams]
    );

    if (tenants.length <= 1) return null;

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 whitespace-nowrap">Viewing tenant:</span>
            <div className="relative">
                <select
                    value={activeTenantId}
                    onChange={(e) => handleChange(e.target.value)}
                    className="appearance-none pl-7 pr-8 py-1.5 text-sm font-medium bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                    {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                {/* Status dot inside select */}
                <span
                    className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${
                        STATUS_DOT[tenants.find((t) => t.id === activeTenantId)?.status ?? ''] ?? 'bg-neutral-300'
                    }`}
                />
                {/* Chevron */}
                <svg
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}
