import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getActiveSchoolYearWithPhase } from '@/lib/date-service';
import { ItemType } from '@prisma/client';

import { getEffectiveSessionUser } from '@/lib/impersonate-actions';

export default async function MyEvaluationRedirect() {
  const effectiveSession = await getEffectiveSessionUser();
  if (!effectiveSession?.user?.email) {
    redirect('/auth/signin');
  }

  const staffProfile = effectiveSession.staffProfile;

  if (!staffProfile) {
    redirect('/dashboard');
  }

  const { schoolYear } = await getActiveSchoolYearWithPhase();
  if (!schoolYear) {
    redirect('/dashboard');
  }

  // Find existing evaluation
  let evaluation = await prisma.evaluation.findFirst({
    where: {
      staffProfileId: staffProfile.id,
      schoolYearId: schoolYear.id,
    },
  });

  if (!evaluation) {
    // Create new evaluation initialized with default 4 standard skills
    evaluation = await prisma.evaluation.create({
      data: {
        schoolYearId: schoolYear.id,
        staffProfileId: staffProfile.id,
        supervisorId: staffProfile.supervisorId,
        deptHeadId: staffProfile.deptHeadId,
        staffNameSnapshot: staffProfile.fullName,
        jobTitleSnapshot: staffProfile.jobDescription?.title || 'Staff Member',
        campusSnapshot: staffProfile.campus,
        departmentSnapshot: staffProfile.department,
        items: {
          create: [
            {
              itemType: ItemType.SKILL,
              orderIndex: 1,
              title: 'Communication',
              weight: 5,
            },
            {
              itemType: ItemType.SKILL,
              orderIndex: 2,
              title: 'Problem Solving',
              weight: 5,
            },
            {
              itemType: ItemType.SKILL,
              orderIndex: 3,
              title: 'Teamwork',
              weight: 5,
            },
            {
              itemType: ItemType.SKILL,
              orderIndex: 4,
              title: 'Decision Making',
              weight: 5,
            },
          ],
        },
        goals: {
          create: [
            { goalIndex: 1, description: '' },
            { goalIndex: 2, description: '' },
            { goalIndex: 3, description: '' },
          ],
        },
      },
    });
  }

  redirect(`/evaluations/${evaluation.id}`);
}
