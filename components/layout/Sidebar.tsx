'use client';

/**
 * Sidebar Navigation Component
 *
 * Left sidebar navigation for the dashboard
 * - Desktop (≥1024px): Fixed sidebar
 * - Mobile/Tablet (<1024px): Drawer menu
 */

import { useState } from 'react';
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
  Menu,
  BookOpen,
  FolderOpen,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    translationKey: 'nav.documents',
    href: '/documents',
    icon: FolderOpen,
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
  {
    translationKey: 'nav.sops',
    href: '/settings/sops',
    icon: BookOpen,
  },
];

// Test accounts for quick switching
const testAccounts = [
  { email: 'admin@smilelab.si', password: 'admin123', name: 'Admin User', role: 'ADMIN' },
  { email: 'tech@smilelab.si', password: 'user123', name: 'Technician', role: 'TECHNICIAN' },
  { email: 'qc@smilelab.si', password: 'user123', name: 'QC Inspector', role: 'QC_INSPECTOR' },
  { email: 'invoice@smilelab.si', password: 'user123', name: 'Invoicing', role: 'INVOICING' },
];

/**
 * Shared Navigation Content Component
 * Used by both desktop sidebar and mobile drawer
 */
function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const locale = useLocale();
  const t = useTranslations();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleLogout = async () => {
    const callbackUrl = `${window.location.origin}/${locale}/login`;
    await signOut({ callbackUrl });
  };

  const handleSignOutClick = () => {
    setShowSignOutDialog(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutDialog(false);
    await handleLogout();
  };

  const handleSwitchAccount = async (email: string, password: string) => {
    try {
      await signOut({ redirect: false });
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
    <>
      {/* Logo/Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Smilelab MDR</h1>
            <p className="text-[10px] text-gray-400 mt-0.5">Dental Lab Management</p>
          </div>
          {session?.user?.role !== 'TECHNICIAN' && <LanguageSwitcher />}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems
            .filter((item) => {
              if (session?.user?.role === 'TECHNICIAN') {
                return ['/orders', '/worksheets', '/quality-control', '/materials', '/settings/sops'].includes(item.href);
              }
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
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(item.translationKey)}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* Settings - Pinned at Bottom */}
      {session?.user?.role !== 'TECHNICIAN' && (
        <div className="p-2">
          <Link
            href={`/${locale}/settings`}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
              pathname === `/${locale}/settings`
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Settings className="h-4 w-4" />
            <span>{t('nav.settings')}</span>
          </Link>
        </div>
      )}

      {/* User Profile & Actions */}
      <div className="p-2 border-t border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild suppressHydrationWarning>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-3 py-2 h-auto text-gray-300 hover:bg-gray-800 hover:text-white text-sm"
              suppressHydrationWarning
            >
              <User className="h-4 w-4" />
              <div className="flex-1 text-left">
                <p className="text-sm">
                  {session?.user?.name || 'User'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {session?.user?.role || 'Role'}
                </p>
              </div>
              <ChevronDown className="h-3 w-3" />
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

            {/* Account Switcher */}
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
              onClick={handleSignOutClick}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('auth.signOutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('auth.signOutConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('auth.staySignedInButton')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSignOut}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {t('auth.signOutButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile/Tablet Header with Hamburger (< lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold text-white">Smilelab MDR</h1>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-52 p-0 bg-gray-900 text-white border-gray-800">
              <div className="flex flex-col h-full">
                <NavigationContent onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar (≥ lg) */}
      <aside className="hidden lg:flex w-52 bg-gray-900 text-white min-h-screen flex-col">
        <NavigationContent />
      </aside>
    </>
  );
}
