'use client';

/**
 * Staff SOP Library
 *
 * Browse and view approved SOPs
 * See acknowledgment status
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, CheckCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SOP {
  id: string;
  code: string;
  title: string;
  category: string;
  versionNumber: string;
  approvedAt: string;
  approvedBy: {
    name: string;
  };
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export default function StaffSOPLibraryPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('staff');
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const CATEGORY_OPTIONS = [
    { value: 'PRODUCTION', label: t('categoryProduction') },
    { value: 'EQUIPMENT', label: t('categoryEquipment') },
    { value: 'MATERIAL', label: t('categoryMaterial') },
    { value: 'QUALITY', label: t('categoryQuality') },
    { value: 'DOCUMENTATION', label: t('categoryDocumentation') },
    { value: 'PERSONNEL', label: t('categoryPersonnel') },
    { value: 'RISK_MANAGEMENT', label: t('categoryRiskManagement') },
    { value: 'OTHER', label: t('categoryOther') },
  ];

  // Helper function to get translated category label
  const getCategoryLabel = (category: string): string => {
    const option = CATEGORY_OPTIONS.find(opt => opt.value === category);
    return option ? option.label : category;
  };

  useEffect(() => {
    fetchSOPs();
  }, [categoryFilter]);

  const fetchSOPs = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/staff/sops?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSOPs(data);
      }
    } catch (error) {
      console.error('Failed to fetch SOPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSOPs = sops.filter((sop) =>
    search
      ? sop.title.toLowerCase().includes(search.toLowerCase()) ||
        sop.code.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const acknowledgedCount = sops.filter((sop) => sop.acknowledged).length;
  const pendingCount = sops.length - acknowledgedCount;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div>
        <h1 className="text-sm font-bold text-gray-900">{t('sopLibrary')}</h1>
        <p className="text-gray-500 mt-1">
          {t('sopLibraryDescription')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('totalSOPs')}</p>
                <p className="text-sm font-bold text-gray-900">{sops.length}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('acknowledged')}</p>
                <p className="text-sm font-bold text-green-600">{acknowledgedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('pending')}</p>
                <p className="text-sm font-bold text-orange-600">{pendingCount}</p>
              </div>
              <Search className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SOPs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('standardOperatingProcedures')} ({filteredSOPs.length})</CardTitle>
          <CardDescription>
            {t('clickToView')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('loadingSOPs')}</div>
          ) : filteredSOPs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('noSOPsFound')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('code')}</TableHead>
                  <TableHead>{t('title')}</TableHead>
                  <TableHead>{t('category')}</TableHead>
                  <TableHead>{t('version')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSOPs.map((sop) => (
                  <TableRow key={sop.id}>
                    <TableCell className="font-medium">{sop.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{sop.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(sop.category)}</Badge>
                    </TableCell>
                    <TableCell>{sop.versionNumber}</TableCell>
                    <TableCell>
                      {sop.acknowledged ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">{t('acknowledged')}</span>
                        </div>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800">{t('pending')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${locale}/staff/sops/${sop.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
