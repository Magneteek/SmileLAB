'use client';

/**
 * Sidebar Navigation Component
 *
 * Left sidebar navigation for the dashboard
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  FileText,
  Users,
  Package,
  DollarSign,
  LayoutDashboard,
  Settings,
  ClipboardList,
  ClipboardCheck,
  LogOut,
  User,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface NavItem {
  translationKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    translationKey: 'nav.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    translationKey: 'nav.orders',
    href: '/orders',
    icon: FileText,
  },
  {
    translationKey: 'nav.worksheets',
    href: '/worksheets',
    icon: ClipboardList,
  },
  {
    translationKey: 'nav.qualityControl',
    href: '/quality-control',
    icon: ClipboardCheck,
  },
  {
    translationKey: 'nav.invoices',
    href: '/invoices',
    icon: Receipt,
  },
  {
    translationKey: 'nav.dentists',
    href: '/dentists',
    icon: Users,
  },
  {
    translationKey: 'nav.materials',
    href: '/materials',
    icon: Package,
  },
  {
    translationKey: 'nav.pricing',
    href: '/pricing',
    icon: DollarSign,
  },
];

// Test accounts for quick switching
const testAccounts = [
  { email: 'admin@smilelab.si', password: 'admin123', name: 'Admin User', role: 'ADMIN' },
  { email: 'tech@smilelab.si', password: 'user123', name: 'Technician', role: 'TECHNICIAN' },
  { email: 'qc@smilelab.si', password: 'user123', name: 'QC Inspector', role: 'QC_INSPECTOR' },
  { email: 'invoice@smilelab.si', password: 'user123', name: 'Invoicing', role: 'INVOICING' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const locale = useLocale();
  const t = useTranslations();

  const handleLogout = async () => {
    // Use window.location.origin to get the correct URL with port
    const callbackUrl = `${window.location.origin}/${locale}/login`;
    await signOut({ callbackUrl });
  };

  const handleSwitchAccount = async (email: string, password: string) => {
    try {
      // Sign out first
      await signOut({ redirect: false });

      // Sign in with new account
      const response = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to switch account:', error);
    }
  };

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Smilelab MDR</h1>
            <p className="text-xs text-gray-400 mt-1">Dental Lab Management</p>
          </div>
          {/* Hide language switcher for TECHNICIAN */}
          {session?.user?.role !== 'TECHNICIAN' && <LanguageSwitcher />}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems
            .filter((item) => {
              // For TECHNICIAN, only show: Orders, Worksheets, Quality Control, Materials
              if (session?.user?.role === 'TECHNICIAN') {
                return ['/orders', '/worksheets', '/quality-control', '/materials'].includes(item.href);
              }
              // For all other roles, show all items
              return true;
            })
            .map((item) => {
              const localizedHref = `/${locale}${item.href}`;
              const isActive =
                pathname === localizedHref ||
                (item.href !== '/dashboard' && pathname?.startsWith(localizedHref));
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={localizedHref}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{t(item.translationKey)}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* Settings - Pinned at Bottom (Hidden for TECHNICIAN) */}
      {session?.user?.role !== 'TECHNICIAN' && (
        <div className="p-4">
          <Link
            href={`/${locale}/settings`}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              pathname === `/${locale}/settings`
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">{t('nav.settings')}</span>
          </Link>
        </div>
      )}

      {/* User Profile & Actions */}
      <div className="p-4 border-t border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild suppressHydrationWarning>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-3 h-auto text-gray-300 hover:bg-gray-800 hover:text-white"
              suppressHydrationWarning
            >
              <User className="h-5 w-5" />
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-400">
                  {session?.user?.role || 'Role'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Account Switcher - Hidden for TECHNICIAN */}
            {session?.user?.role !== 'TECHNICIAN' && (
              <>
                <DropdownMenuLabel className="text-xs text-gray-500">
                  Switch Account
                </DropdownMenuLabel>
                {testAccounts.map((account) => (
                  <DropdownMenuItem
                    key={account.email}
                    onClick={() => handleSwitchAccount(account.email, account.password)}
                    className="cursor-pointer"
                    disabled={session?.user?.email === account.email}
                  >
                    <User className="h-4 w-4 mr-2" />
                    <div className="flex-1">
                      <p className="text-sm">{account.name}</p>
                      <p className="text-xs text-gray-500">{account.role}</p>
                    </div>
                    {session?.user?.email === account.email && (
                      <span className="text-xs text-blue-500">Active</span>
                    )}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
              </>
            )}

            {/* Logout */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
