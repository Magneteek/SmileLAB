import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialFormClient } from '@/components/materials/MaterialFormClient';

export const metadata = {
  title: 'New Material | Smilelab MDR',
  description: 'Create a new material',
};

export default async function NewMaterialPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only ADMIN and TECHNICIAN can create materials
  if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/materials');
  }

  const t = await getTranslations('material');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/materials">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('createTitle')}</h1>
          <p className="text-muted-foreground">{t('createSubtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('newMaterialCardTitle')}</CardTitle>
          <CardDescription>
            {t('newMaterialCardDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaterialFormClient />
        </CardContent>
      </Card>
    </div>
  );
}
