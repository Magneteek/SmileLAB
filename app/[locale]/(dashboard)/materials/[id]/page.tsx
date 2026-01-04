import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Package, Edit, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaterialDetailClient } from '@/components/materials/MaterialDetailClient';
import { MATERIAL_TYPE_LABELS } from '@/types/material';

interface MaterialDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MaterialDetailPage({ params }: MaterialDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const material = await prisma.material.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          lots: true,
        },
      },
    },
  });

  if (!material) {
    notFound();
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
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h1 className="text-3xl font-bold">{material.name}</h1>
            {!material.active && (
              <Badge variant="secondary">{t('inactiveBadge')}</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {material.code} • {MATERIAL_TYPE_LABELS[material.type]}
          </p>
        </div>
        <div className="flex gap-2">
          {session.user.role === 'ADMIN' && (
            <Link href={`/materials/${id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                {t('editMaterialButton')}
              </Button>
            </Link>
          )}
          {['ADMIN', 'TECHNICIAN'].includes(session.user.role) && (
            <Link href={`/materials/${id}/lots/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('recordArrivalButton')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Material Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detailsInfoCardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('detailsManufacturer')}</p>
              <p className="font-medium">{material.manufacturer}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('detailsUnit')}</p>
              <p className="font-medium">{material.unit}</p>
            </div>
            {material.description && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">{t('detailsDescription')}</p>
                <p className="font-medium">{material.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{t('detailsBiocompatible')}</p>
              <Badge variant={material.biocompatible ? 'default' : 'secondary'}>
                {material.biocompatible ? t('yes') : t('no')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('detailsCEMarked')}</p>
              <Badge variant={material.ceMarked ? 'default' : 'secondary'}>
                {material.ceMarked ? t('yes') : t('no')}
              </Badge>
            </div>
            {material.iso10993Cert && (
              <div>
                <p className="text-sm text-muted-foreground">{t('detailsISO10993')}</p>
                <p className="font-medium">{material.iso10993Cert}</p>
              </div>
            )}
            {material.ceNumber && (
              <div>
                <p className="text-sm text-muted-foreground">{t('detailsCENumber')}</p>
                <p className="font-medium">{material.ceNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for LOTs, Traceability, and Statistics */}
      <MaterialDetailClient materialId={id} />
    </div>
  );
}
