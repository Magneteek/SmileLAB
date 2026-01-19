'use client';

// Material LOTs Table Component
// Displays LOTs in FIFO order with status, expiry warnings

import { useTranslations } from 'next-intl';
import { MaterialLotWithMaterial } from '@/types/material';
import { LOT_STATUS_COLORS } from '@/types/material';
import type { MaterialLotStatus } from '@prisma/client';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { MoreVertical, AlertTriangle, CheckCircle2, XCircle, Ban, Trash2 } from 'lucide-react';

interface MaterialLotsTableProps {
  lots: MaterialLotWithMaterial[];
  onUpdateStatus?: (lotId: string, status: MaterialLotStatus) => void;
  onAdjustQuantity?: (lotId: string) => void;
  onViewTraceability?: (lotId: string) => void;
  onDelete?: (lotId: string) => void;
}

// Status icon mapping
const STATUS_ICONS: Record<MaterialLotStatus, React.ReactNode> = {
  AVAILABLE: <CheckCircle2 className="h-4 w-4" />,
  DEPLETED: <XCircle className="h-4 w-4" />,
  EXPIRED: <AlertTriangle className="h-4 w-4" />,
  RECALLED: <Ban className="h-4 w-4" />,
};

export function MaterialLotsTable({
  lots,
  onUpdateStatus,
  onAdjustQuantity,
  onViewTraceability,
  onDelete,
}: MaterialLotsTableProps) {
  const t = useTranslations('material');

  // Get days until expiry
  const getDaysUntilExpiry = (expiryDate: Date | string | null): number | null => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiryDateObj = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
    const diff = expiryDateObj.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Get expiry severity
  const getExpirySeverity = (
    daysUntilExpiry: number | null
  ): 'critical' | 'warning' | 'ok' | 'expired' | 'none' => {
    if (daysUntilExpiry === null) return 'none';
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 7) return 'critical';
    if (daysUntilExpiry < 30) return 'warning';
    return 'ok';
  };

  // Get badge color for status
  const getStatusBadgeColor = (status: MaterialLotStatus): string => {
    const color = LOT_STATUS_COLORS[status];
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800',
      red: 'bg-red-100 text-red-800',
      orange: 'bg-orange-100 text-orange-800',
    };
    return colorMap[color] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">{t('lotsFIFOHeader')}</TableHead>
            <TableHead>{t('lotsTableHeaderLOT')}</TableHead>
            <TableHead>{t('lotsTableHeaderArrival')}</TableHead>
            <TableHead>{t('lotsTableHeaderExpiry')}</TableHead>
            <TableHead>{t('lotsTableHeaderSupplier')}</TableHead>
            <TableHead className="text-right">{t('lotsTableHeaderReceived')}</TableHead>
            <TableHead className="text-right">{t('lotsTableHeaderAvailable')}</TableHead>
            <TableHead>{t('lotsTableHeaderStatus')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                {t('lotsEmptyMessage')}
              </TableCell>
            </TableRow>
          ) : (
            lots.map((lot, index) => {
              const daysUntilExpiry = getDaysUntilExpiry(lot.expiryDate);
              const expirySeverity = getExpirySeverity(daysUntilExpiry);
              const utilizationRate =
                Number(lot.quantityReceived) > 0
                  ? (Number(lot.quantityAvailable) / Number(lot.quantityReceived)) * 100
                  : 0;

              return (
                <TableRow key={lot.id}>
                  {/* FIFO Order Indicator */}
                  <TableCell>
                    {lot.status === 'AVAILABLE' &&
                    Number(lot.quantityAvailable) > 0 &&
                    index === 0 ? (
                      <Badge className="bg-blue-600">{t('lotsBadgeFirst')}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">#{index + 1}</span>
                    )}
                  </TableCell>

                  {/* LOT Number */}
                  <TableCell className="font-medium">{lot.lotNumber}</TableCell>

                  {/* Arrival Date */}
                  <TableCell>{format(new Date(lot.arrivalDate), 'MMM dd, yyyy')}</TableCell>

                  {/* Expiry Date with Warning */}
                  <TableCell>
                    {lot.expiryDate ? (
                      <div className="flex items-center gap-2">
                        <span>{format(new Date(lot.expiryDate), 'MMM dd, yyyy')}</span>
                        {expirySeverity === 'critical' && (
                          <Badge className="bg-red-600 text-white">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {daysUntilExpiry}d
                          </Badge>
                        )}
                        {expirySeverity === 'warning' && (
                          <Badge className="bg-yellow-500 text-white">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {daysUntilExpiry}d
                          </Badge>
                        )}
                        {expirySeverity === 'expired' && (
                          <Badge className="bg-red-600 text-white">{t('lotsBadgeExpired')}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{t('lotsNoExpiry')}</span>
                    )}
                  </TableCell>

                  {/* Supplier */}
                  <TableCell>{lot.supplierName}</TableCell>

                  {/* Quantity Received */}
                  <TableCell className="text-right">
                    {Number(lot.quantityReceived).toFixed(2)}
                  </TableCell>

                  {/* Quantity Available */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={
                          Number(lot.quantityAvailable) <= 0
                            ? 'text-red-600 font-semibold'
                            : utilizationRate < 25
                            ? 'text-red-600'
                            : utilizationRate < 50
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }
                      >
                        {Number(lot.quantityAvailable).toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {utilizationRate.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge className={getStatusBadgeColor(lot.status)} variant="secondary">
                      <span className="mr-1">{STATUS_ICONS[lot.status]}</span>
                      {t(`status${lot.status}` as any)}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50">
                        {onViewTraceability && (
                          <>
                            <DropdownMenuItem onClick={() => onViewTraceability(lot.id)}>
                              {t('lotsDropdownViewTraceability')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {onAdjustQuantity && lot.status === 'AVAILABLE' && (
                          <DropdownMenuItem onClick={() => onAdjustQuantity(lot.id)}>
                            {t('lotsDropdownAdjustQuantity')}
                          </DropdownMenuItem>
                        )}
                        {onUpdateStatus && (
                          <>
                            <DropdownMenuSeparator />
                            {lot.status !== 'EXPIRED' && expirySeverity === 'expired' && (
                              <DropdownMenuItem
                                onClick={() => onUpdateStatus(lot.id, 'EXPIRED')}
                                className="text-red-600"
                              >
                                {t('lotsDropdownMarkExpired')}
                              </DropdownMenuItem>
                            )}
                            {lot.status === 'AVAILABLE' &&
                              Number(lot.quantityAvailable) <= 0 && (
                                <DropdownMenuItem
                                  onClick={() => onUpdateStatus(lot.id, 'DEPLETED')}
                                >
                                  {t('lotsDropdownMarkDepleted')}
                                </DropdownMenuItem>
                              )}
                            {lot.status !== 'RECALLED' && (
                              <DropdownMenuItem
                                onClick={() => onUpdateStatus(lot.id, 'RECALLED')}
                                className="text-orange-600"
                              >
                                {t('lotsDropdownMarkRecalled')}
                              </DropdownMenuItem>
                            )}
                            {lot.status !== 'AVAILABLE' &&
                              Number(lot.quantityAvailable) > 0 && (
                                <DropdownMenuItem
                                  onClick={() => onUpdateStatus(lot.id, 'AVAILABLE')}
                                  className="text-green-600"
                                >
                                  {t('lotsDropdownRestoreAvailable')}
                                </DropdownMenuItem>
                              )}
                          </>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(lot.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('lotsDropdownDeleteLOT')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
