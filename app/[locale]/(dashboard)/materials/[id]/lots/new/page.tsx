import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StockArrivalFormClient } from '@/components/materials/StockArrivalFormClient';

interface NewLotPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: 'Record Stock Arrival | Smilelab MDR',
  description: 'Record a new material LOT arrival',
};

export default async function NewLotPage({ params }: NewLotPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  // Only ADMIN and TECHNICIAN can record arrivals
  if (!['ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
    redirect(`/materials/${id}`);
  }

  const material = await prisma.material.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      unit: true,
    },
  });

  if (!material) {
    notFound();
  }

  const t = await getTranslations('material');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/materials/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('arrivalFormTitle')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('arrivalFormMaterialLabel')}: {material.name} ({material.code})
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('arrivalCardTitle')}</CardTitle>
          <CardDescription>
            {t('arrivalCardDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StockArrivalFormClient
            materialId={id}
            materialName={material.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
