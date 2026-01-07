/**
 * Activity Service
 *
 * Handles fetching and managing system activity logs
 */

import { prisma } from '@/lib/prisma';
import { RecentActivity } from './dashboard-service';

export interface GetActivityLogParams {
  type?: string;
  page?: number;
  pageSize?: number;
  userId?: string;
}

export interface ActivityLogResult {
  activities: RecentActivity[];
  total: number;
}

/**
 * Get paginated activity log with optional filtering
 */
export async function getActivityLog(
  params: GetActivityLogParams = {}
): Promise<ActivityLogResult> {
  const { type, page = 1, pageSize = 20, userId } = params;

  // Build where clause
  const where: any = {};

  if (type && type !== 'all') {
    // Map activity types to their corresponding actions
    switch (type) {
      case 'ORDER':
        where.action = { contains: 'ORDER' };
        break;
      case 'WORKSHEET':
        where.action = { contains: 'WORKSHEET' };
        break;
      case 'MATERIAL':
        where.action = { contains: 'MATERIAL' };
        break;
      case 'QC':
        where.action = { contains: 'QC' };
        break;
      case 'INVOICE':
        where.action = { contains: 'INVOICE' };
        break;
      case 'DOCUMENT':
        where.action = { contains: 'DOCUMENT' };
        break;
    }
  }

  if (userId) {
    where.userId = userId;
  }

  // Get total count
  const total = await prisma.auditLog.count({ where });

  // Get paginated logs
  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Transform to RecentActivity format
  const activities: RecentActivity[] = logs.map((log) => {
    // Determine activity type from action
    let activityType: RecentActivity['type'] = 'DOCUMENT';

    if (log.action.includes('ORDER')) {
      activityType = 'ORDER';
    } else if (log.action.includes('WORKSHEET')) {
      activityType = 'WORKSHEET';
    } else if (log.action.includes('MATERIAL')) {
      activityType = 'MATERIAL';
    } else if (log.action.includes('QC')) {
      activityType = 'QC';
    } else if (log.action.includes('INVOICE')) {
      activityType = 'INVOICE';
    }

    // Build description from action and entityType
    const description = `${log.action} ${log.entityType}${log.entityId ? ` (${log.entityId.slice(0, 8)}...)` : ''}`;

    return {
      id: log.id,
      type: activityType,
      action: log.action,
      description,
      timestamp: log.timestamp,
      userId: log.userId,
      userName: log.user?.name || 'System',
    };
  });

  return {
    activities,
    total,
  };
}

/**
 * Get activity log for a specific user
 */
export async function getUserActivityLog(
  userId: string,
  params: Omit<GetActivityLogParams, 'userId'> = {}
): Promise<ActivityLogResult> {
  return getActivityLog({ ...params, userId });
}
