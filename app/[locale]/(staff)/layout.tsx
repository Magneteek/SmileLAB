/**
 * Staff Layout
 *
 * Simple layout for STAFF users - SOP/training access only
 */

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { FileText, GraduationCap, Home } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { StaffHeader } from '@/components/layout/StaffHeader';

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { locale } = await params;
  const t = await getTranslations();

  // Redirect if not authenticated
  if (!session) {
    redirect(`/${locale}/login`);
  }

  // Redirect if not STAFF role
  if (session.user.role !== 'STAFF') {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Smilelab MDR</h1>
              <p className="text-sm text-gray-500">{t('staff.portalTitle')}</p>
            </div>
            <StaffHeader userName={session.user.name} locale={locale} />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href={`/${locale}/staff/dashboard`}
              className="inline-flex items-center px-1 pt-4 pb-3 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <Home className="h-4 w-4 mr-2" />
              {t('staff.dashboard')}
            </Link>
            <Link
              href={`/${locale}/staff/sops`}
              className="inline-flex items-center px-1 pt-4 pb-3 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <FileText className="h-4 w-4 mr-2" />
              SOPs
            </Link>
            <Link
              href={`/${locale}/staff/training`}
              className="inline-flex items-center px-1 pt-4 pb-3 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              {t('staff.myTraining')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
