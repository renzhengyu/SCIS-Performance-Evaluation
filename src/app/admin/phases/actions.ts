'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updatePhaseDatesAction(
  schoolYearId: string,
  payload: {
    phase1StartDate: string;
    phase1EndDate: string;
    phase2StartDate: string;
    phase2EndDate: string;
    phase3StartDate: string;
    phase3EndDate: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden');
  }

  const updated = await prisma.schoolYear.update({
    where: { id: schoolYearId },
    data: {
      phase1StartDate: new Date(payload.phase1StartDate),
      phase1EndDate: new Date(payload.phase1EndDate),
      phase2StartDate: new Date(payload.phase2StartDate),
      phase2EndDate: new Date(payload.phase2EndDate),
      phase3StartDate: new Date(payload.phase3StartDate),
      phase3EndDate: new Date(payload.phase3EndDate),
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: 'PHASE_SCHEDULE_UPDATED',
    entityType: 'SchoolYear',
    entityId: schoolYearId,
    diffData: payload,
  });

  revalidatePath('/admin/phases');
  revalidatePath('/dashboard');
  return { success: true };
}
