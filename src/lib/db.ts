import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Record an audit log entry for any critical modification
 */
export async function logAudit({
  userId,
  userEmail,
  userName,
  action,
  entityType,
  entityId,
  diffData,
  ipAddress,
}: {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  diffData?: any;
  ipAddress?: string | null;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        userName,
        action,
        entityType,
        entityId,
        diffData: diffData ? (typeof diffData === 'object' ? diffData : { note: diffData }) : undefined,
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
