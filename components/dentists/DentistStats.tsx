'use client';

/**
 * DentistStats Component
 *
 * Displays statistics and metrics for a dentist/clinic.
 * Features: Visual cards with icons, revenue tracking, activity metrics.
 */

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ClipboardList,
  FileText,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Calendar,
  Activity,
} from 'lucide-react';
import { DentistStats as DentistStatsType } from '@/types/dentist';

interface DentistStatsProps {
  stats: DentistStatsType;
}

export function DentistStats({ stats }: DentistStatsProps) {
  const t = useTranslations();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sl-SI', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return t('dentist.statsNever');
    return new Intl.DateTimeFormat('sl-SI', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const statCards = [
    {
      title: t('dentist.statsTotalOrders'),
      value: stats.totalOrders,
      icon: ClipboardList,
      description: t('dentist.statsTotalOrdersDesc'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('dentist.statsActiveOrders'),
      value: stats.activeOrders,
      icon: AlertCircle,
      description: t('dentist.statsActiveOrdersDesc'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: t('dentist.statsCompletedOrders'),
      value: stats.completedOrders,
      icon: CheckCircle,
      description: t('dentist.statsCompletedOrdersDesc'),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('dentist.statsTotalWorksheets'),
      value: stats.totalWorksheets,
      icon: FileText,
      description: t('dentist.statsTotalWorksheetsDesc'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: t('dentist.statsActiveWorksheets'),
      value: stats.activeWorksheets,
      icon: Activity,
      description: t('dentist.statsActiveWorksheetsDesc'),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: t('dentist.statsCompletedWorksheets'),
      value: stats.completedWorksheets,
      icon: CheckCircle,
      description: t('dentist.statsCompletedWorksheetsDesc'),
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
  ];

  const revenueCards = [
    {
      title: t('dentist.statsTotalRevenue'),
      value: stats.totalRevenue ? formatCurrency(stats.totalRevenue) : t('dentist.statsNA'),
      icon: DollarSign,
      description: t('dentist.statsTotalRevenueDesc'),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: t('dentist.statsAverageOrderValue'),
      value: stats.averageOrderValue
        ? formatCurrency(stats.averageOrderValue)
        : t('dentist.statsNA'),
      icon: TrendingUp,
      description: t('dentist.statsAverageOrderValueDesc'),
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
  ];

  const activityCards = [
    {
      title: t('dentist.statsOrdersThisMonth'),
      value: stats.ordersThisMonth,
      icon: Calendar,
      description: t('dentist.statsOrdersThisMonthDesc'),
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
    {
      title: t('dentist.statsOrdersThisYear'),
      value: stats.ordersThisYear,
      icon: Calendar,
      description: t('dentist.statsOrdersThisYearDesc'),
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Order & Worksheet Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('dentist.statsSectionMetrics')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Revenue Statistics */}
      {stats.totalRevenue !== undefined && (
        <div>
          <h3 className="text-lg font-semibold mb-4">{t('dentist.statsSectionRevenue')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {revenueCards.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Time-Based Activity */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t('dentist.statsSectionActivity')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activityCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Last Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('dentist.statsLastActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">{t('dentist.statsLastOrderDate')}</p>
              <p className="text-sm font-medium mt-1">
                {formatDate(stats.lastOrderDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('dentist.statsLastWorksheetDate')}</p>
              <p className="text-sm font-medium mt-1">
                {formatDate(stats.lastWorksheetDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
