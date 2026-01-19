/**
 * Staff Dashboard
 *
 * Landing page for STAFF users
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, GraduationCap, Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function StaffDashboardPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations();

  return (
    <div className="space-y-2">
      {/* Welcome section */}
      <div>
        <h2 className="text-sm font-bold text-gray-900">
          {t('staff.welcome', { name: session?.user.name })}
        </h2>
        <p className="text-gray-500 mt-2">
          {t('staff.subtitle')}
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card>
          <CardHeader>
            <FileText className="h-10 w-10 text-blue-600 mb-2" />
            <CardTitle>{t('staff.sopLibraryTitle')}</CardTitle>
            <CardDescription>
              {t('staff.sopLibraryDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {t('staff.sopLibraryContent')}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              {t('staff.comingSoonPhase4')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <GraduationCap className="h-10 w-10 text-green-600 mb-2" />
            <CardTitle>{t('staff.trainingTitle')}</CardTitle>
            <CardDescription>
              {t('staff.trainingDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {t('staff.trainingContent')}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              {t('staff.comingSoonPhase5')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-10 w-10 text-purple-600 mb-2" />
            <CardTitle>{t('staff.complianceTitle')}</CardTitle>
            <CardDescription>
              {t('staff.complianceDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {t('staff.complianceContent')}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              {t('staff.retentionEnforced')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('staff.yourAccount')}</CardTitle>
          <CardDescription>{t('staff.accountDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('staff.name')}</dt>
              <dd className="text-sm text-gray-900 mt-1">{session?.user.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('staff.email')}</dt>
              <dd className="text-sm text-gray-900 mt-1">{session?.user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('staff.role')}</dt>
              <dd className="text-sm text-gray-900 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {t('staff.staffMember')}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('staff.accessLevel')}</dt>
              <dd className="text-sm text-gray-900 mt-1">{t('staff.accessLevelValue')}</dd>
            </div>
          </dl>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>{t('staff.noteLabel')}</strong> {t('staff.noteContent')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
