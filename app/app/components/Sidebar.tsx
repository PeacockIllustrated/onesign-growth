'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    CheckSquare,
    FolderOpen,
    FileText,
    CreditCard,
    Shield,
    ChevronLeft,
    ChevronRight,
    Users,
    Building2,
    Package,
    Zap,
    Calculator,
    DollarSign,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
    isAdmin: boolean;
}

const navItems = [
    { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Deliverables', href: '/app/deliverables', icon: CheckSquare },
    { label: 'Assets', href: '/app/assets', icon: FolderOpen },
    { label: 'Reports', href: '/app/reports', icon: FileText },
    { label: 'Billing', href: '/app/billing', icon: CreditCard },
];

const adminItem = { label: 'Admin', href: '/app/admin', icon: Shield };

const adminSubItems = [
    { label: 'Leads', href: '/app/admin/leads', icon: Users },
    { label: 'Orgs', href: '/app/admin/orgs', icon: Building2 },
    { label: 'Subscriptions', href: '/app/admin/subscriptions', icon: Package },
    { label: 'Reports', href: '/app/admin/reports', icon: FileText },
    { label: 'Deliverables', href: '/app/admin/deliverables', icon: Zap },
    { label: 'Quotes', href: '/app/admin/quotes', icon: Calculator },
    { label: 'Pricing', href: '/app/admin/pricing', icon: DollarSign },
];

export function Sidebar({ isAdmin }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const isAdminSection = pathname.startsWith('/app/admin');
    const allItems = isAdmin ? [...navItems, adminItem] : navItems;

    return (
        <aside
            className={`
                bg-white border-r border-neutral-200 flex flex-col
                transition-all duration-200 ease-in-out
                ${collapsed ? 'w-16' : 'w-56'}
            `}
        >
            {/* Logo */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-100">
                {!collapsed && (
                    <Link href="/app/dashboard" className="font-bold text-sm tracking-tight">
                        OneSign <span className="text-neutral-400 font-normal">Portal</span>
                    </Link>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 overflow-y-auto">
                <ul className="space-y-1">
                    {allItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== '/app/admin' && pathname.startsWith(item.href + '/')) ||
                            (item.href === '/app/admin' && isAdminSection);

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium
                                        transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black
                                        ${isActive
                                            ? 'bg-black text-white'
                                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-black'
                                        }
                                        ${collapsed ? 'justify-center' : ''}
                                    `}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon size={18} />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>

                                {/* Admin Sub-navigation */}
                                {item.href === '/app/admin' && isAdmin && isAdminSection && !collapsed && (
                                    <ul className="mt-1 ml-4 space-y-0.5 border-l border-neutral-200 pl-3">
                                        {adminSubItems.map((subItem) => {
                                            const SubIcon = subItem.icon;
                                            const isSubActive = pathname === subItem.href;

                                            return (
                                                <li key={subItem.href}>
                                                    <Link
                                                        href={subItem.href}
                                                        className={`
                                                            flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium
                                                            transition-colors duration-150
                                                            ${isSubActive
                                                                ? 'bg-neutral-100 text-black'
                                                                : 'text-neutral-500 hover:bg-neutral-50 hover:text-black'
                                                            }
                                                        `}
                                                    >
                                                        <SubIcon size={14} />
                                                        <span>{subItem.label}</span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-neutral-100">
                    <p className="text-xs text-neutral-400">
                        &copy; {new Date().getFullYear()} OneSign
                    </p>
                </div>
            )}
        </aside>
    );
}

