'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import { getEffectiveDate, calculatePhase } from '@/lib/date-service';
import { calculateGrade } from '@/lib/scoring';
import { EvaluationStatus, ItemType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Save / Submit Phase 1: Responsibility selection (4-8 items), weights (sum strictly to 80), and goals (2-3 items)
 */
export async function savePhase1Action(
  evaluationId: string,
  payload: {
    responsibilities: { title: string; weight: number }[];
    goals: { goalIndex: number; description: string }[];
    devRequestEmployee?: string;
    devRequestSupervisor?: string;
    otherCommentsEmployee?: string;
    otherCommentsSupervisor?: string;
    isSubmitting?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      schoolYear: true,
      staffProfile: { include: { user: true } },
      supervisor: { include: { user: true } },
    },
  });
  if (!evaluation) throw new Error('Evaluation not found');

  const userEmail = session.user.email.toLowerCase();
  const isStaff = evaluation.staffProfile.email.toLowerCase() === userEmail;
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === userEmail;
  const userRole = (session.user as any).role;
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN';

  if (!isStaff && !isSupervisor && !isAdmin) {
    throw new Error('You do not have permission to edit this evaluation.');
  }

  // Phase window check
  const { date: effectiveDate, isSimulated } = await getEffectiveDate();
  const phaseInfo = calculatePhase(evaluation.schoolYear, effectiveDate, isSimulated);

  if (!isAdmin && (!phaseInfo.isOpen || phaseInfo.phase !== 1)) {
    throw new Error('Phase 1 is currently closed for editing.');
  }

  // Validation
  const { responsibilities, goals } = payload;
  if (responsibilities.length < 4 || responsibilities.length > 8) {
    throw new Error('You must select between 4 and 8 responsibilities.');
  }

  const weightSum = responsibilities.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  if (weightSum !== 80) {
    throw new Error(`The sum of weights must strictly equal 80. Current sum is ${weightSum}.`);
  }

  for (const r of responsibilities) {
    if (r.weight <= 0 || r.weight > 20) {
      throw new Error(`Each responsibility weight must be between 1 and 20 points. Problem with: "${r.title.slice(0, 30)}..."`);
    }
  }

  // Delete existing responsibility items and recreate them cleanly
  await prisma.evaluationItem.deleteMany({
    where: { evaluationId, itemType: ItemType.RESPONSIBILITY },
  });

  await prisma.evaluationItem.createMany({
    data: responsibilities.map((r, idx) => ({
      evaluationId,
      itemType: ItemType.RESPONSIBILITY,
      orderIndex: idx + 1,
      title: r.title,
      weight: r.weight,
    })),
  });

  // Update goals
  for (const g of goals) {
    await prisma.evaluationGoal.upsert({
      where: {
        id: `${evaluationId}-g-${g.goalIndex}`,
      },
      update: { description: g.description },
      create: {
        id: `${evaluationId}-g-${g.goalIndex}`,
        evaluationId,
        goalIndex: g.goalIndex,
        description: g.description,
      },
    });
  }

  // Update Section C development comments & status
  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      devRequestEmployee: payload.devRequestEmployee ?? evaluation.devRequestEmployee,
      devRequestSupervisor: payload.devRequestSupervisor ?? evaluation.devRequestSupervisor,
      otherCommentsEmployee: payload.otherCommentsEmployee ?? evaluation.otherCommentsEmployee,
      otherCommentsSupervisor: payload.otherCommentsSupervisor ?? evaluation.otherCommentsSupervisor,
      ...(payload.isSubmitting
        ? {
            status: EvaluationStatus.PHASE1_SUBMITTED,
            submittedPhase1At: new Date(),
          }
        : {}),
    },
  });

  // Audit log
  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: payload.isSubmitting ? 'PHASE1_SUBMITTED' : 'PHASE1_DRAFT_SAVED',
    entityType: 'Evaluation',
    entityId: evaluationId,
    diffData: {
      responsibilityCount: responsibilities.length,
      weightSum,
      isSubmitting: payload.isSubmitting,
    },
  });

  revalidatePath(`/evaluations/${evaluationId}`);
  return { success: true };
}

/**
 * Save / Submit Phase 2: Mid-Year Review comments
 */
export async function savePhase2Action(
  evaluationId: string,
  payload: {
    midYearCommentsEmployee?: string;
    midYearCommentsSupervisor?: string;
    isSubmitting?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      schoolYear: true,
      staffProfile: { include: { user: true } },
      supervisor: { include: { user: true } },
    },
  });
  if (!evaluation) throw new Error('Evaluation not found');

  const userEmail = session.user.email.toLowerCase();
  const isStaff = evaluation.staffProfile.email.toLowerCase() === userEmail;
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === userEmail;
  const userRole = (session.user as any).role;
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN';

  if (!isStaff && !isSupervisor && !isAdmin) {
    throw new Error('Unauthorized to edit this evaluation.');
  }

  const { date: effectiveDate, isSimulated } = await getEffectiveDate();
  const phaseInfo = calculatePhase(evaluation.schoolYear, effectiveDate, isSimulated);

  if (!isAdmin && (!phaseInfo.isOpen || phaseInfo.phase !== 2)) {
    throw new Error('Phase 2 is currently closed for editing.');
  }

  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      midYearCommentsEmployee: payload.midYearCommentsEmployee ?? evaluation.midYearCommentsEmployee,
      midYearCommentsSupervisor: payload.midYearCommentsSupervisor ?? evaluation.midYearCommentsSupervisor,
      ...(payload.isSubmitting
        ? {
            status: EvaluationStatus.PHASE2_SUBMITTED,
            submittedPhase2At: new Date(),
          }
        : {}),
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: payload.isSubmitting ? 'PHASE2_SUBMITTED' : 'PHASE2_DRAFT_SAVED',
    entityType: 'Evaluation',
    entityId: evaluationId,
    diffData: {
      hasEmployeeComment: !!payload.midYearCommentsEmployee,
      hasSupervisorComment: !!payload.midYearCommentsSupervisor,
    },
  });

  revalidatePath(`/evaluations/${evaluationId}`);
  return { success: true };
}

/**
 * Save / Submit Phase 3: Scoring (Part A & Part B) & End-of-year comments
 */
export async function savePhase3Action(
  evaluationId: string,
  payload: {
    itemScores: { id: string; scoreSelf?: number | null; scoreSupervisor?: number | null }[];
    finalCommentsEmployee?: string;
    finalCommentsSupervisor?: string;
    isSelfSubmission?: boolean;
    isFinalSupervisorSubmission?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('Unauthorized');

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      schoolYear: true,
      items: true,
      staffProfile: { include: { user: true } },
      supervisor: { include: { user: true } },
    },
  });
  if (!evaluation) throw new Error('Evaluation not found');

  const userEmail = session.user.email.toLowerCase();
  const isStaff = evaluation.staffProfile.email.toLowerCase() === userEmail;
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === userEmail;
  const userRole = (session.user as any).role;
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN';

  if (!isStaff && !isSupervisor && !isAdmin) {
    throw new Error('Unauthorized to edit this evaluation.');
  }

  const { date: effectiveDate, isSimulated } = await getEffectiveDate();
  const phaseInfo = calculatePhase(evaluation.schoolYear, effectiveDate, isSimulated);

  if (!isAdmin && (!phaseInfo.isOpen || phaseInfo.phase !== 3)) {
    throw new Error('Phase 3 is currently closed for editing.');
  }

  // Update item scores
  for (const s of payload.itemScores) {
    const existing = evaluation.items.find((it) => it.id === s.id);
    if (!existing) continue;

    // Validate score <= weight
    if (s.scoreSelf !== undefined && s.scoreSelf !== null) {
      if (s.scoreSelf < 0 || s.scoreSelf > existing.weight) {
        throw new Error(`Self score for "${existing.title.slice(0, 25)}..." cannot exceed its weight of ${existing.weight}.`);
      }
    }
    if (s.scoreSupervisor !== undefined && s.scoreSupervisor !== null) {
      if (s.scoreSupervisor < 0 || s.scoreSupervisor > existing.weight) {
        throw new Error(`Supervisor score for "${existing.title.slice(0, 25)}..." cannot exceed its weight of ${existing.weight}.`);
      }
    }

    await prisma.evaluationItem.update({
      where: { id: s.id },
      data: {
        ...(s.scoreSelf !== undefined ? { scoreSelf: s.scoreSelf } : {}),
        ...(s.scoreSupervisor !== undefined ? { scoreSupervisor: s.scoreSupervisor } : {}),
      },
    });
  }

  // Re-calculate totals
  const allUpdatedItems = await prisma.evaluationItem.findMany({
    where: { evaluationId },
  });

  const partAItems = allUpdatedItems.filter((i) => i.itemType === ItemType.RESPONSIBILITY);
  const partBItems = allUpdatedItems.filter((i) => i.itemType === ItemType.SKILL);

  const totalPartASelf = partAItems.reduce((acc, i) => acc + (i.scoreSelf || 0), 0);
  const totalPartASupervisor = partAItems.reduce((acc, i) => acc + (i.scoreSupervisor || 0), 0);

  const totalPartBSelf = partBItems.reduce((acc, i) => acc + (i.scoreSelf || 0), 0);
  const totalPartBSupervisor = partBItems.reduce((acc, i) => acc + (i.scoreSupervisor || 0), 0);

  const totalSelf = totalPartASelf + totalPartBSelf;
  const totalSupervisor = totalPartASupervisor + totalPartBSupervisor;

  const finalGradeInfo = calculateGrade(totalSupervisor);

  let nextStatus = evaluation.status;
  if (payload.isSelfSubmission) {
    nextStatus = EvaluationStatus.PHASE3_SELF_COMPLETED;
  }
  if (payload.isFinalSupervisorSubmission) {
    nextStatus = EvaluationStatus.COMPLETED;
  }

  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      totalScorePartASelf: totalPartASelf,
      totalScorePartASupervisor: totalPartASupervisor,
      totalScorePartBSelf: totalPartBSelf,
      totalScorePartBSupervisor: totalPartBSupervisor,
      totalScoreSelf: totalSelf,
      totalScoreSupervisor: totalSupervisor,
      assessmentGrade: finalGradeInfo.grade,
      finalCommentsEmployee: payload.finalCommentsEmployee ?? evaluation.finalCommentsEmployee,
      finalCommentsSupervisor: payload.finalCommentsSupervisor ?? evaluation.finalCommentsSupervisor,
      status: nextStatus,
      ...(payload.isSelfSubmission ? { submittedPhase3SelfAt: new Date() } : {}),
      ...(payload.isFinalSupervisorSubmission ? { completedAt: new Date() } : {}),
    },
  });

  await logAudit({
    userId: (session.user as any).id,
    userEmail: session.user.email,
    userName: (session.user as any).fullName || session.user.name,
    action: payload.isFinalSupervisorSubmission
      ? 'PHASE3_FINAL_COMPLETED'
      : payload.isSelfSubmission
      ? 'PHASE3_SELF_SUBMITTED'
      : 'PHASE3_SCORES_SAVED',
    entityType: 'Evaluation',
    entityId: evaluationId,
    diffData: {
      totalScoreSelf: totalSelf,
      totalScoreSupervisor: totalSupervisor,
      grade: finalGradeInfo.grade,
    },
  });

  revalidatePath(`/evaluations/${evaluationId}`);
  return { success: true };
}
