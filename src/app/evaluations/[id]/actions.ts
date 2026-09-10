'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, logAudit } from '@/lib/db';
import { getEffectiveDate, calculatePhase } from '@/lib/date-service';
import { calculateGrade } from '@/lib/scoring';
import { EvaluationStatus, ItemType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getEffectiveSessionUser } from '@/lib/impersonate-actions';

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
  const effectiveSession = await getEffectiveSessionUser();
  if (!effectiveSession?.user?.email) throw new Error('Unauthorized');

  const user = effectiveSession.user;
  const userEmail = user.email.toLowerCase();

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      schoolYear: true,
      staffProfile: { include: { user: true } },
      supervisor: { include: { user: true } },
      deptHead: { include: { user: true } },
    },
  });
  if (!evaluation) throw new Error('Evaluation not found');

  const isStaff = evaluation.staffProfile.email.toLowerCase() === userEmail;
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === userEmail;
  const isDeptHead = evaluation.deptHead?.email.toLowerCase() === userEmail;
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN';

  if (!isStaff && !isSupervisor && !isDeptHead && !isAdmin) {
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
  const weightSum = responsibilities.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);

  if (payload.isSubmitting) {
    if (!isSupervisor && !isDeptHead && !isAdmin) {
      throw new Error('Only the supervisor or department leader can submit Phase 1.');
    }
    if (responsibilities.length < 4 || responsibilities.length > 8) {
      throw new Error('You must select between 4 and 8 responsibilities before submitting Phase 1.');
    }

    if (weightSum !== 80) {
      throw new Error(`The sum of weights must strictly equal 80 to submit Phase 1. Current sum is ${weightSum}.`);
    }

    for (const r of responsibilities) {
      if (r.weight <= 0 || r.weight > 20) {
        throw new Error(`Each responsibility weight must be between 1 and 20 points. Problem with: "${r.title.slice(0, 30)}..."`);
      }
    }
  }

  // Only supervisor or admin can update responsibilities
  if ((isSupervisor || isDeptHead || isAdmin) && responsibilities.length > 0) {
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
  }

  // Update goals (either staff or supervisor/admin can update goals)
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

  // Role-based development comments update
  const devUpdate: any = {};
  if (isStaff || isAdmin) {
    if (payload.devRequestEmployee !== undefined) devUpdate.devRequestEmployee = payload.devRequestEmployee;
    if (payload.otherCommentsEmployee !== undefined) devUpdate.otherCommentsEmployee = payload.otherCommentsEmployee;
  }
  if (isSupervisor || isDeptHead || isAdmin) {
    if (payload.devRequestSupervisor !== undefined) devUpdate.devRequestSupervisor = payload.devRequestSupervisor;
    if (payload.otherCommentsSupervisor !== undefined) devUpdate.otherCommentsSupervisor = payload.otherCommentsSupervisor;
  }

  if (payload.isSubmitting) {
    devUpdate.status = EvaluationStatus.PHASE1_SUBMITTED;
    devUpdate.submittedPhase1At = new Date();
  }

  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: devUpdate,
  });

  // Audit log
  await logAudit({
    userId: user.id,
    userEmail: user.email,
    userName: effectiveSession.staffProfile?.fullName || user.name || user.email,
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
  const effectiveSession = await getEffectiveSessionUser();
  if (!effectiveSession?.user?.email) throw new Error('Unauthorized');

  const user = effectiveSession.user;
  const userEmail = user.email.toLowerCase();

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      schoolYear: true,
      staffProfile: { include: { user: true } },
      supervisor: { include: { user: true } },
      deptHead: { include: { user: true } },
    },
  });
  if (!evaluation) throw new Error('Evaluation not found');

  const isStaff = evaluation.staffProfile.email.toLowerCase() === userEmail;
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === userEmail;
  const isDeptHead = evaluation.deptHead?.email.toLowerCase() === userEmail;
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN';

  if (!isStaff && !isSupervisor && !isDeptHead && !isAdmin) {
    throw new Error('Unauthorized to edit this evaluation.');
  }

  const { date: effectiveDate, isSimulated } = await getEffectiveDate();
  const phaseInfo = calculatePhase(evaluation.schoolYear, effectiveDate, isSimulated);

  if (!isAdmin && (!phaseInfo.isOpen || phaseInfo.phase !== 2)) {
    throw new Error('Phase 2 is currently closed for editing.');
  }

  const updateData: any = {};
  if (isStaff || isAdmin) {
    if (payload.midYearCommentsEmployee !== undefined) {
      updateData.midYearCommentsEmployee = payload.midYearCommentsEmployee;
    }
  }
  if (isSupervisor || isDeptHead || isAdmin) {
    if (payload.midYearCommentsSupervisor !== undefined) {
      updateData.midYearCommentsSupervisor = payload.midYearCommentsSupervisor;
    }
  }

  if (payload.isSubmitting) {
    updateData.status = EvaluationStatus.PHASE2_SUBMITTED;
    updateData.submittedPhase2At = new Date();
  }

  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: updateData,
  });

  await logAudit({
    userId: user.id,
    userEmail: user.email,
    userName: effectiveSession.staffProfile?.fullName || user.name || user.email,
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
    itemScores: { id?: string; title?: string; scoreSelf?: number | null; scoreSupervisor?: number | null }[];
    finalCommentsEmployee?: string;
    finalCommentsSupervisor?: string;
    devRequestEmployee?: string;
    devRequestSupervisor?: string;
    otherCommentsEmployee?: string;
    otherCommentsSupervisor?: string;
    isSelfSubmission?: boolean;
    isFinalSupervisorSubmission?: boolean;
  }
) {
  const effectiveSession = await getEffectiveSessionUser();
  if (!effectiveSession?.user?.email) throw new Error('Unauthorized');

  const user = effectiveSession.user;
  const userEmail = user.email.toLowerCase();

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      schoolYear: true,
      items: true,
      staffProfile: { include: { user: true } },
      supervisor: { include: { user: true } },
      deptHead: { include: { user: true } },
    },
  });
  if (!evaluation) throw new Error('Evaluation not found');

  const isStaff = evaluation.staffProfile.email.toLowerCase() === userEmail;
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === userEmail;
  const isDeptHead = evaluation.deptHead?.email.toLowerCase() === userEmail;
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN';

  if (!isStaff && !isSupervisor && !isDeptHead && !isAdmin) {
    throw new Error('Unauthorized to edit this evaluation.');
  }

  const { date: effectiveDate, isSimulated } = await getEffectiveDate();
  const phaseInfo = calculatePhase(evaluation.schoolYear, effectiveDate, isSimulated);

  if (!isAdmin && (!phaseInfo.isOpen || phaseInfo.phase !== 3)) {
    throw new Error('Phase 3 is currently closed for editing.');
  }

  // Update item scores with role isolation and clamping
  for (const s of payload.itemScores) {
    const existing = evaluation.items.find((it) => it.id === s.id || (s.title && it.title === s.title));
    if (!existing) continue;

    const itemUpdate: any = {};

    // Staff / Admin can update self scores
    if ((isStaff || isAdmin) && s.scoreSelf !== undefined) {
      if (s.scoreSelf !== null) {
        if (s.scoreSelf < 0 || s.scoreSelf > existing.weight) {
          throw new Error(`Self score for "${existing.title.slice(0, 25)}..." cannot exceed its weight of ${existing.weight}.`);
        }
        itemUpdate.scoreSelf = Math.max(0, Math.min(existing.weight, s.scoreSelf));
      } else {
        itemUpdate.scoreSelf = null;
      }
    }

    // Supervisor / Dept Head / Admin can update supervisor scores
    if ((isSupervisor || isDeptHead || isAdmin) && s.scoreSupervisor !== undefined) {
      if (s.scoreSupervisor !== null) {
        if (s.scoreSupervisor < 0 || s.scoreSupervisor > existing.weight) {
          throw new Error(`Supervisor score for "${existing.title.slice(0, 25)}..." cannot exceed its weight of ${existing.weight}.`);
        }
        itemUpdate.scoreSupervisor = Math.max(0, Math.min(existing.weight, s.scoreSupervisor));
      } else {
        itemUpdate.scoreSupervisor = null;
      }
    }

    if (Object.keys(itemUpdate).length > 0) {
      await prisma.evaluationItem.update({
        where: { id: existing.id },
        data: itemUpdate,
      });
    }
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

  const hasSupervisorScores = allUpdatedItems.some((i) => i.scoreSupervisor !== null && i.scoreSupervisor !== undefined);
  const isSupervisorScoringDone = (isSupervisor || isDeptHead || isAdmin) && payload.isFinalSupervisorSubmission && totalSupervisor > 0;
  const finalGradeInfo = isSupervisorScoringDone ? calculateGrade(totalSupervisor) : null;

  let nextStatus = evaluation.status;
  if (payload.isSelfSubmission && (isStaff || isAdmin)) {
    nextStatus = EvaluationStatus.PHASE3_SELF_COMPLETED;
  }
  if (payload.isFinalSupervisorSubmission && (isSupervisor || isDeptHead || isAdmin)) {
    nextStatus = EvaluationStatus.COMPLETED;
  }

  const evalUpdate: any = {
    totalScorePartASelf: totalPartASelf,
    totalScorePartASupervisor: totalPartASupervisor,
    totalScorePartBSelf: totalPartBSelf,
    totalScorePartBSupervisor: totalPartBSupervisor,
    totalScoreSelf: totalSelf,
    totalScoreSupervisor: totalSupervisor,
    status: nextStatus,
  };

  if (finalGradeInfo) {
    evalUpdate.assessmentGrade = finalGradeInfo.grade;
  }

  if (isStaff || isAdmin) {
    if (payload.finalCommentsEmployee !== undefined) evalUpdate.finalCommentsEmployee = payload.finalCommentsEmployee;
    if (payload.devRequestEmployee !== undefined) evalUpdate.devRequestEmployee = payload.devRequestEmployee;
    if (payload.otherCommentsEmployee !== undefined) evalUpdate.otherCommentsEmployee = payload.otherCommentsEmployee;
    if (payload.isSelfSubmission) evalUpdate.submittedPhase3SelfAt = new Date();
  }

  if (isSupervisor || isDeptHead || isAdmin) {
    if (payload.finalCommentsSupervisor !== undefined) evalUpdate.finalCommentsSupervisor = payload.finalCommentsSupervisor;
    if (payload.devRequestSupervisor !== undefined) evalUpdate.devRequestSupervisor = payload.devRequestSupervisor;
    if (payload.otherCommentsSupervisor !== undefined) evalUpdate.otherCommentsSupervisor = payload.otherCommentsSupervisor;
    if (payload.isFinalSupervisorSubmission) evalUpdate.completedAt = new Date();
  }

  await prisma.evaluation.update({
    where: { id: evaluationId },
    data: evalUpdate,
  });

  await logAudit({
    userId: user.id,
    userEmail: user.email,
    userName: effectiveSession.staffProfile?.fullName || user.name || user.email,
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
      grade: finalGradeInfo ? finalGradeInfo.grade : null,
    },
  });

  revalidatePath(`/evaluations/${evaluationId}`);
  return { success: true };
}
