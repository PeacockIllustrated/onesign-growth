import { getUserOrg, isSuperAdmin } from '@/lib/auth';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { redirect } from 'next/navigation';

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Get user's org context (this also enforces auth)
    const orgContext = await getUserOrg();

    if (!orgContext) {
        // User is authenticated but not part of any org
        redirect('/login?error=no_org');
    }

    // Only show admin tab to OneSign super admins
    const isAdmin = await isSuperAdmin();

    return (
        <div className="min-h-screen bg-[hsl(var(--surface-50))] flex">
            {/* Sidebar */}
            <Sidebar isAdmin={isAdmin} />

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <Topbar org={orgContext.org} />

                {/* Page content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
