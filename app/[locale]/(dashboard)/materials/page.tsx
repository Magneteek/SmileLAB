import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Package, Scan } from 'lucide-react';
import { MaterialsClientWrapper } from '@/components/materials/MaterialsClientWrapper';

export const metadata = {
  title: 'Materials | Smilelab MDR',
  description: 'Manage materials inventory with LOT tracking and FIFO',
};

export default async function MaterialsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const t = await getTranslations('material');

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 sm:h-8 sm:w-8" />
            {t('listTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('listSubtitle')}
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {['ADMIN', 'TECHNICIAN'].includes(session.user.role) && (
            <Link href="/materials/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t('newButton')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Client component with data fetching */}
      <MaterialsClientWrapper />
    </div>
  );
}
