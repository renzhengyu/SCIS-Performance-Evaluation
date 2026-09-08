import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getActiveSchoolYearWithPhase } from '@/lib/date-service';
import { ItemType } from '@prisma/client';

export default async function MyEvaluationRedirect() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: {
      staffProfile: {
        include: {
          jobDescription: true,
          supervisor: true,
          deptHead: true,
        },
      },
    },
  });

  if (!user?.staffProfile) {
    redirect('/dashboard');
  }

  const { schoolYear } = await getActiveSchoolYearWithPhase();
  if (!schoolYear) {
    redirect('/dashboard');
  }

  // Find existing evaluation
  let evaluation = await prisma.evaluation.findFirst({
    where: {
      staffProfileId: user.staffProfile.id,
      schoolYearId: schoolYear.id,
    },
  });

  if (!evaluation) {
    // Create new evaluation initialized with default 4 standard skills
    evaluation = await prisma.evaluation.create({
      data: {
        schoolYearId: schoolYear.id,
        staffProfileId: user.staffProfile.id,
        supervisorId: user.staffProfile.supervisorId,
        deptHeadId: user.staffProfile.deptHeadId,
        staffNameSnapshot: user.staffProfile.fullName,
        jobTitleSnapshot: user.staffProfile.jobDescription?.title || 'Staff Member',
        campusSnapshot: user.staffProfile.campus,
        departmentSnapshot: user.staffProfile.department,
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
