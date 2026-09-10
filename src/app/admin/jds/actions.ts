'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function saveJobDescriptionAction(
  id: string | null,
  payload: {
    title: string;
    reportsToJdId?: string | null;
    positionSummary: string;
    responsibilities: string[];
    skillsAttributes: string[];
    qualifications: string[];
    lastRevisedDate?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden: HR or Super Admin required');
  }

  const cleanTitle = payload.title.trim();
  if (!cleanTitle) {
    throw new Error('Job Title is required.');
  }

  // 1. Enforce unique job title
  const existingWithSameTitle = await prisma.jobDescription.findFirst({
    where: {
      title: { equals: cleanTitle, mode: 'insensitive' },
      ...(id && id !== 'new' ? { NOT: { id } } : {}),
    },
  });

  if (existingWithSameTitle) {
    throw new Error(
      `A Job Description with the title "${cleanTitle}" already exists. Job titles must be unique to avoid duplicate JDs.`
    );
  }

  // 2. Resolve "reports to" JD
  let reportsToTitle = 'None / Head of School';
  if (payload.reportsToJdId) {
    const parentJd = await prisma.jobDescription.findUnique({
      where: { id: payload.reportsToJdId },
    });
    if (parentJd) {
      reportsToTitle = parentJd.title;
    }
  }

  const data = {
    title: cleanTitle,
    reportsToJdId: payload.reportsToJdId || null,
    reportsTo: reportsToTitle,
    positionSummary: payload.positionSummary.trim(),
    responsibilities: payload.responsibilities.filter((r) => r.trim() !== ''),
    skillsAttributes: payload.skillsAttributes.filter((s) => s.trim() !== ''),
    qualifications: payload.qualifications.filter((q) => q.trim() !== ''),
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
    diffData: { title: jd.title, reportsTo: reportsToTitle },
  });

  revalidatePath('/admin/jds');
  return { success: true, id: jd.id };
}

/**
 * Update the centralized global policy footer for all JDs
 */
export async function updateStandardPolicyFooterAction(footerText: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden');
  }

  await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    update: { standardJdFooterText: footerText.trim() },
    create: { id: 'singleton', standardJdFooterText: footerText.trim() },
  });

  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: 'STANDARD_JD_FOOTER_UPDATED',
    entityType: 'SystemConfig',
    entityId: 'singleton',
    diffData: { footerText: footerText.trim() },
  });

  revalidatePath('/admin/jds');
  return { success: true };
}

/**
 * Upload and parse a Job Description from Word format (.docx / .doc)
 */
export async function parseJobDescriptionFileAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    throw new Error('Forbidden: Super Admin or HR Admin required to upload Job Descriptions.');
  }

  const file = formData.get('file') as File | null;
  if (!file || typeof file === 'string') {
    throw new Error('No file was uploaded.');
  }

  const filename = file.name || 'document.docx';
  const lowerName = filename.toLowerCase();
  if (!lowerName.endsWith('.docx') && !lowerName.endsWith('.doc')) {
    throw new Error('Invalid file format. Please upload a Word document (.docx or .doc).');
  }

  // Max 10MB limit
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds the 10MB limit.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { extractTextFromWordBuffer, parseJobDescriptionText } = await import('@/lib/jd-doc-parser');

  const rawText = await extractTextFromWordBuffer(buffer, filename);
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('The uploaded document is empty or could not be read.');
  }

  const existingJds = await prisma.jobDescription.findMany({
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  const parsed = parseJobDescriptionText(rawText, existingJds);

  return {
    success: true,
    data: parsed,
    filename,
  };
}

