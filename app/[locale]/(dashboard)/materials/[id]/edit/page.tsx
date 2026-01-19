import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialEditClient } from '@/components/materials/MaterialEditClient';

export const metadata = {
  title: 'Edit Material | Smilelab MDR',
  description: 'Edit material details',
};

interface MaterialEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MaterialEditPage({ params }: MaterialEditPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Only ADMIN and TECHNICIAN can edit materials
  if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
    redirect('/materials');
  }

  const { id } = await params;
  const t = await getTranslations('material');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Link href="/materials">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-sm font-bold">{t('editTitle')}</h1>
          <p className="text-muted-foreground">{t('editSubtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('editMaterialCardTitle')}</CardTitle>
          <CardDescription>
            {t('editMaterialCardDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaterialEditClient materialId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
