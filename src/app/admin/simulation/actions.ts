'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateSimulationDateAction({
  isSimulationMode,
  simulatedDate,
}: {
  isSimulationMode: boolean;
  simulatedDate?: string | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden: Admin access required');
  }

  const dateValue = simulatedDate ? new Date(simulatedDate) : null;

  await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    update: {
      isSimulationMode,
      simulatedDate: isSimulationMode ? dateValue : null,
    },
    create: {
      id: 'singleton',
      isSimulationMode,
      simulatedDate: isSimulationMode ? dateValue : null,
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: isSimulationMode ? 'SIMULATION_MODE_ENABLED' : 'SIMULATION_MODE_DISABLED',
    entityType: 'SystemConfig',
    entityId: 'singleton',
    diffData: { isSimulationMode, simulatedDate },
  });

  revalidatePath('/', 'layout');
  return { success: true };
}
