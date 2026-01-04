/**
 * Price History Timeline Component
 *
 * Visual timeline display of all price changes with dates, amounts, and reasons.
 */

'use client';

import type { ProductPriceHistory } from '@prisma/client';
import { formatCurrency, formatPriceChange } from '@/types/product';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PriceHistoryTimelineProps {
  priceHistory: ProductPriceHistory[];
  currentPrice: number;
}

export default function PriceHistoryTimeline({
  priceHistory,
  currentPrice,
}: PriceHistoryTimelineProps) {
  if (priceHistory.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No price history available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {priceHistory.map((entry, index) => {
        const price = parseFloat(entry.price.toString());
        const isActive = !entry.effectiveTo;
        const previousEntry = priceHistory[index + 1];
        const previousPrice = previousEntry
          ? parseFloat(previousEntry.price.toString())
          : null;

        // Determine price change direction
        let changeIcon = <Minus className="h-4 w-4" />;
        let changeColor = 'text-gray-500';
        let changeText = '';

        if (previousPrice !== null) {
          if (price > previousPrice) {
            changeIcon = <TrendingUp className="h-4 w-4" />;
            changeColor = 'text-green-600';
            changeText = formatPriceChange(previousPrice, price);
          } else if (price < previousPrice) {
            changeIcon = <TrendingDown className="h-4 w-4" />;
            changeColor = 'text-red-600';
            changeText = formatPriceChange(previousPrice, price);
          }
        }

        return (
          <Card key={entry.id} className={isActive ? 'border-green-500 border-2' : ''}>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Date Range */}
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium">
                      {format(new Date(entry.effectiveFrom), 'PPP')}
                      {entry.effectiveTo && (
                        <>
                          {' → '}
                          {format(new Date(entry.effectiveTo), 'PPP')}
                        </>
                      )}
                    </p>
                    {isActive && (
                      <Badge variant="default" className="bg-green-600">
                        Current
                      </Badge>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-2xl font-bold">
                      {formatCurrency(price)}
                    </p>
                    {previousPrice !== null && price !== previousPrice && (
                      <div className={`flex items-center gap-1 ${changeColor}`}>
                        {changeIcon}
                        <span className="text-sm font-medium">{changeText}</span>
                      </div>
                    )}
                  </div>

                  {/* Reason */}
                  {entry.reason && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Reason:</span> {entry.reason}
                      </p>
                    </div>
                  )}

                  {/* Duration */}
                  {entry.effectiveTo && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Duration:{' '}
                      {Math.ceil(
                        (new Date(entry.effectiveTo).getTime() -
                          new Date(entry.effectiveFrom).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </p>
                  )}
                </div>

                {/* Timeline Connector */}
                {index < priceHistory.length - 1 && (
                  <div className="ml-4 flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <div className="w-0.5 h-full bg-border mt-2" />
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Summary */}
      {priceHistory.length > 1 && (
        <Card className="bg-muted/50">
          <div className="p-4">
            <p className="text-sm font-medium mb-2">Price History Summary</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Changes</p>
                <p className="font-semibold">{priceHistory.length - 1}</p>
              </div>
              <div>
                <p className="text-muted-foreground">First Price</p>
                <p className="font-semibold">
                  {formatCurrency(
                    parseFloat(
                      priceHistory[priceHistory.length - 1].price.toString()
                    )
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Price</p>
                <p className="font-semibold">{formatCurrency(currentPrice)}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
