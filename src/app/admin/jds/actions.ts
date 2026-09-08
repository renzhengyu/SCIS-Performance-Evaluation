'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function saveJobDescriptionAction(
  id: string | null,
  payload: {
    title: string;
    reportsTo: string;
    positionSummary: string;
    responsibilities: string[];
    skillsAttributes: string[];
    qualifications: string[];
    fixedFooterText: string;
    lastRevisedDate?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden');
  }

  const data = {
    title: payload.title.trim(),
    reportsTo: payload.reportsTo.trim(),
    positionSummary: payload.positionSummary.trim(),
    responsibilities: payload.responsibilities.filter((r) => r.trim() !== ''),
    skillsAttributes: payload.skillsAttributes.filter((s) => s.trim() !== ''),
    qualifications: payload.qualifications.filter((q) => q.trim() !== ''),
    fixedFooterText: payload.fixedFooterText.trim(),
    lastRevisedDate: payload.lastRevisedDate ? new Date(payload.lastRevisedDate) : new Date(),
  };

  let jd;
  let actionName = 'CREATE_JD';

  if (id && id !== 'new') {
    actionName = 'UPDATE_JD';
    jd = await prisma.jobDescription.update({
      where: { id },
      data,
    });
  } else {
    jd = await prisma.jobDescription.create({
      data,
    });
  }

  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: actionName,
    entityType: 'JobDescription',
    entityId: jd.id,
    diffData: { title: jd.title, reportsTo: jd.reportsTo },
  });

  revalidatePath('/admin/jds');
  return { success: true, id: jd.id };
}
