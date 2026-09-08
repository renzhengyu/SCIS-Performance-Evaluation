import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getEffectiveDate, calculatePhase } from '@/lib/date-service';
import Navbar from '@/components/Navbar';
import EvaluationForm from '@/components/evaluation/EvaluationForm';

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      schoolYear: true,
      staffProfile: {
        include: {
          jobDescription: true,
          supervisor: true,
          deptHead: true,
        },
      },
      supervisor: true,
      deptHead: true,
      items: {
        orderBy: { orderIndex: 'asc' },
      },
      goals: {
        orderBy: { goalIndex: 'asc' },
      },
    },
  });

  if (!evaluation) {
    notFound();
  }

  const userEmail = session.user.email.toLowerCase();
  const isStaff = evaluation.staffProfile.email.toLowerCase() === userEmail;
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === userEmail;
  const isDeptHead = evaluation.deptHead?.email.toLowerCase() === userEmail;
  const userRole = (session.user as any).role;
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN';

  // Access control: only involved parties can view
  if (!isStaff && !isSupervisor && !isDeptHead && !isAdmin) {
    redirect('/dashboard');
  }

  const { date: effectiveDate, isSimulated } = await getEffectiveDate();
  const phaseInfo = calculatePhase(evaluation.schoolYear, effectiveDate, isSimulated);

  // Available responsibilities from linked JD
  const jd = evaluation.staffProfile.jobDescription;
  const availableJDResponsibilities = Array.isArray(jd?.responsibilities)
    ? (jd?.responsibilities as string[])
    : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        phaseInfo={{
          phase: phaseInfo.phase,
          phaseName: phaseInfo.phaseName,
          isOpen: phaseInfo.isOpen,
          effectiveDate: phaseInfo.effectiveDate.toISOString(),
          isSimulationMode: phaseInfo.isSimulationMode,
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EvaluationForm
          evaluation={evaluation}
          currentPhaseInfo={{
            phase: phaseInfo.phase,
            phaseName: phaseInfo.phaseName,
            isOpen: phaseInfo.isOpen,
            effectiveDate: phaseInfo.effectiveDate.toISOString(),
            isSimulationMode: phaseInfo.isSimulationMode,
          }}
          currentUser={{
            id: (session.user as any).id,
            email: session.user.email,
            role: userRole,
            fullName: (session.user as any).fullName || session.user.name || '',
          }}
          availableJDResponsibilities={availableJDResponsibilities}
        />
      </main>
    </div>
  );
}
