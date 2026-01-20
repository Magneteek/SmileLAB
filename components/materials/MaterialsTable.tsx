'use client';

// Materials Table Component
// Displays materials with filtering, sorting, and pagination

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MaterialWithLots } from '@/types/material';
import type { MaterialType } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, MoreVertical, Edit, Archive, CheckCircle2, XCircle, Trash2, ToggleLeft, ToggleRight, Plus, Scan } from 'lucide-react';
import { SortableTableHeader } from '@/components/shared/SortableTableHeader';
import { useTableSort } from '@/lib/hooks/useTableSort';

interface MaterialsTableProps {
  materials: MaterialWithLots[];
  onEdit?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, currentActive: boolean) => void;
  onQuickAddLot?: (material: MaterialWithLots) => void;
  onSearch?: (search: string) => void;
  onFilterType?: (type: MaterialType | 'all') => void;
  onFilterActive?: (active: boolean | 'all') => void;
}

// Type color mapping
const TYPE_COLORS: Record<MaterialType, string> = {
  CERAMIC: 'bg-blue-100 text-blue-800',
  METAL: 'bg-gray-100 text-gray-800',
  RESIN: 'bg-purple-100 text-purple-800',
  COMPOSITE: 'bg-green-100 text-green-800',
  PORCELAIN: 'bg-pink-100 text-pink-800',
  ZIRCONIA: 'bg-indigo-100 text-indigo-800',
  TITANIUM: 'bg-slate-100 text-slate-800',
  ALLOY: 'bg-amber-100 text-amber-800',
  ACRYLIC: 'bg-cyan-100 text-cyan-800',
  WAX: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-neutral-100 text-neutral-800',
};

export function MaterialsTable({
  materials,
  onEdit,
  onArchive,
  onDelete,
  onToggleActive,
  onQuickAddLot,
  onSearch,
  onFilterType,
  onFilterActive,
}: MaterialsTableProps) {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MaterialType | 'all'>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');

  // Sorting
  const { sortedData: sortedMaterials, sortKey, sortDirection, handleSort } = useTableSort({
    data: materials,
    initialSortKey: 'code',
    initialSortDirection: 'asc',
  });

  // Calculate total available quantity for each material
  const getTotalAvailableQuantity = (lots: MaterialWithLots['lots']): number => {
    return lots
      .filter((lot) => lot.status === 'AVAILABLE' && Number(lot.quantityAvailable) > 0)
      .reduce((sum, lot) => sum + Number(lot.quantityAvailable), 0);
  };

  // Get available lots count
  const getAvailableLotsCount = (lots: MaterialWithLots['lots']): number => {
    return lots.filter(
      (lot) => lot.status === 'AVAILABLE' && Number(lot.quantityAvailable) > 0
    ).length;
  };

  // Determine stock level status
  const getStockLevelStatus = (quantity: number): 'low' | 'medium' | 'good' => {
    if (quantity < 10) return 'low';
    if (quantity < 50) return 'medium';
    return 'good';
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  const handleFilterType = (value: string) => {
    const typeValue = value === 'all' ? 'all' : (value as MaterialType);
    setFilterType(typeValue);
    onFilterType?.(typeValue);
  };

  const handleFilterActive = (value: string) => {
    const activeValue = value === 'all' ? 'all' : value === 'true';
    setFilterActive(activeValue);
    onFilterActive?.(activeValue);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder={t('material.searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row">
          <Select value={filterType} onValueChange={handleFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('material.filterByType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('material.allTypes')}</SelectItem>
              {(['CERAMIC', 'METAL', 'RESIN', 'COMPOSITE', 'PORCELAIN', 'ZIRCONIA', 'TITANIUM', 'ALLOY', 'ACRYLIC', 'WAX', 'OTHER'] as MaterialType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`material.type${type}` as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterActive === 'all' ? 'all' : filterActive.toString()}
            onValueChange={handleFilterActive}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('material.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('material.allStatus')}</SelectItem>
              <SelectItem value="true">{t('material.active')}</SelectItem>
              <SelectItem value="false">{t('material.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">{t('material.tableHeaderActions')}</TableHead>
              <SortableTableHeader
                sortKey="name"
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              >
                {t('material.tableHeaderName')}
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="type"
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              >
                {t('material.tableHeaderType')}
              </SortableTableHeader>
              <TableHead className="text-right">{t('material.tableHeaderLOTs')}</TableHead>
              <SortableTableHeader
                sortKey="manufacturer"
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              >
                {t('material.tableHeaderManufacturer')}
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="ceMarked"
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
                align="center"
              >
                {t('material.tableHeaderCE')}
              </SortableTableHeader>
              <TableHead className="text-right">{t('material.tableHeaderAvailableQty')}</TableHead>
              <SortableTableHeader
                sortKey="active"
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              >
                {t('material.tableHeaderStatus')}
              </SortableTableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t('material.tableEmpty')}
                </TableCell>
              </TableRow>
            ) : (
              sortedMaterials.map((material) => {
                const totalQty = getTotalAvailableQuantity(material.lots);
                const availableLots = getAvailableLotsCount(material.lots);
                const stockLevel = getStockLevelStatus(totalQty);

                return (
                  <TableRow
                    key={material.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => window.location.href = `/materials/${material.id}`}
                  >
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Add LOT Button */}
                        {onQuickAddLot && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onQuickAddLot(material)}
                            title={t('material.quickAddLOTTooltip')}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}

                        {/* More Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50">
                            <DropdownMenuItem asChild>
                              <Link href={`/materials/${material.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t('material.dropdownViewDetails')}
                              </Link>
                            </DropdownMenuItem>
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(material.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('material.dropdownEdit')}
                              </DropdownMenuItem>
                            )}
                            {onToggleActive && (
                              <DropdownMenuItem onClick={() => onToggleActive(material.id, material.active)}>
                                {material.active ? (
                                  <>
                                    <ToggleLeft className="mr-2 h-4 w-4" />
                                    {t('material.dropdownMarkInactive')}
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="mr-2 h-4 w-4" />
                                    {t('material.dropdownMarkActive')}
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem
                                onClick={() => onDelete(material.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('material.dropdownDelete')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                    <TableCell>{material.name}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[material.type]} variant="secondary">
                        {t(`material.type${material.type}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">
                        {availableLots} / {material.lots.length}
                      </span>
                    </TableCell>
                    <TableCell>{material.manufacturer}</TableCell>
                    <TableCell className="text-center">
                      {material.ceMarked ? (
                        <CheckCircle2 className="inline h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="inline h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          stockLevel === 'low'
                            ? 'text-red-600 font-semibold'
                            : stockLevel === 'medium'
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }
                      >
                        {totalQty.toFixed(2)} {material.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      {material.active ? (
                        <Badge variant="default" className="bg-green-600">
                          {t('material.active')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t('material.inactive')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
