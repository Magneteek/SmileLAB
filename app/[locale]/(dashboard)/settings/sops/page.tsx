'use client';

/**
 * SOP Management Page
 *
 * List, filter, and manage Standard Operating Procedures
 * Admin/QC access only
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Plus, Search, MoreVertical, Edit, Trash2, CheckCircle, Eye, Clock, Download } from 'lucide-react';

interface SOP {
  id: string;
  code: string;
  title: string;
  category: string;
  status: 'DRAFT' | 'APPROVED' | 'ARCHIVED';
  versionNumber: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  createdBy: {
    name: string;
  };
  approvedBy?: {
    name: string;
  };
  _count: {
    acknowledgments: number;
  };
}

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
};

export default function SOPsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sopToDelete, setSOPToDelete] = useState<SOP | null>(null);

  const CATEGORY_OPTIONS = [
    { value: 'PRODUCTION', label: t('sop.category.PRODUCTION') },
    { value: 'EQUIPMENT', label: t('sop.category.EQUIPMENT') },
    { value: 'MATERIAL', label: t('sop.category.MATERIAL') },
    { value: 'QUALITY', label: t('sop.category.QUALITY') },
    { value: 'DOCUMENTATION', label: t('sop.category.DOCUMENTATION') },
    { value: 'PERSONNEL', label: t('sop.category.PERSONNEL') },
    { value: 'RISK_MANAGEMENT', label: t('sop.category.RISK_MANAGEMENT') },
    { value: 'OTHER', label: t('sop.category.OTHER') },
  ];

  useEffect(() => {
    fetchSOPs();
  }, [categoryFilter, statusFilter, search]);

  const fetchSOPs = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const response = await fetch(`/api/sops?${params.toString()}`);
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

  const handleDelete = async () => {
    if (!sopToDelete) return;

    try {
      const response = await fetch(`/api/sops/${sopToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSOPs(sops.filter((s) => s.id !== sopToDelete.id));
        setDeleteDialogOpen(false);
        setSOPToDelete(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete SOP');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete SOP');
    }
  };

  const handleApprove = async (sop: SOP) => {
    try {
      const response = await fetch(`/api/sops/${sop.id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchSOPs(); // Refresh list
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve SOP');
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert('Failed to approve SOP');
    }
  };

  const handleDownloadPDF = async (sop: SOP) => {
    try {
      const response = await fetch(`/api/sops/${sop.id}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sop.code}_v${sop.versionNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Download PDF error:', error);
      alert('Failed to generate PDF');
    }
  };

  const filteredSOPs = sops;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-gray-900">{t('sop.title')}</h1>
          <p className="text-gray-500 mt-1">{t('sop.subtitle')}</p>
        </div>
        <Button onClick={() => router.push(`/${locale}/settings/sops/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('sop.createSOP')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('sop.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('sop.filterCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sop.allCategories')}</SelectItem>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t('sop.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sop.allStatuses')}</SelectItem>
                <SelectItem value="DRAFT">{t('sop.status.DRAFT')}</SelectItem>
                <SelectItem value="APPROVED">{t('sop.status.APPROVED')}</SelectItem>
                <SelectItem value="ARCHIVED">{t('sop.status.ARCHIVED')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* SOPs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sop.listTitle')} ({filteredSOPs.length})</CardTitle>
          <CardDescription>
            {t('sop.listDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('sop.detailPage.loadingSOP')}</div>
          ) : filteredSOPs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('sop.messages.noSOPs')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sop.table.code')}</TableHead>
                  <TableHead>{t('sop.table.title')}</TableHead>
                  <TableHead>{t('sop.table.category')}</TableHead>
                  <TableHead>{t('sop.table.version')}</TableHead>
                  <TableHead>{t('sop.table.status')}</TableHead>
                  <TableHead>{t('sop.table.acknowledgments')}</TableHead>
                  <TableHead>{t('sop.table.createdBy')}</TableHead>
                  <TableHead className="text-right">{t('sop.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSOPs.map((sop) => (
                  <TableRow key={sop.id}>
                    <TableCell className="font-medium">{sop.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{sop.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`sop.category.${sop.category}`)}</Badge>
                    </TableCell>
                    <TableCell>{sop.versionNumber}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[sop.status]}>{t(`sop.status.${sop.status}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-gray-400" />
                        {sop._count.acknowledgments}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{sop.createdBy.name}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/${locale}/settings/sops/${sop.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('sop.actions.view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(sop)}>
                            <Download className="h-4 w-4 mr-2" />
                            {t('sop.actions.downloadPDF')}
                          </DropdownMenuItem>
                          {sop.status !== 'APPROVED' && (
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/${locale}/settings/sops/${sop.id}/edit`)
                              }
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('sop.actions.edit')}
                            </DropdownMenuItem>
                          )}
                          {sop.status === 'DRAFT' && (
                            <DropdownMenuItem onClick={() => handleApprove(sop)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('sop.actions.approve')}
                            </DropdownMenuItem>
                          )}
                          {sop.status === 'DRAFT' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSOPToDelete(sop);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('sop.actions.delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sop.detailPage.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sop.detailPage.deleteConfirmMessage', {
                code: sopToDelete?.code || '',
                title: sopToDelete?.title || ''
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSOPToDelete(null)}>{t('sop.createPage.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('sop.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
