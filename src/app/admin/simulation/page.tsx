import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getEffectiveDate, calculatePhase } from '@/lib/date-service';
import Navbar from '@/components/Navbar';
import SimulationControlClient from './SimulationControlClient';
import { Clock } from 'lucide-react';

export default async function SimulationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    redirect('/dashboard');
  }

  const config = await prisma.systemConfig.findUnique({
    where: { id: 'singleton' },
  });

  const { date: effectiveDate, isSimulated } = await getEffectiveDate();

  const activeSchoolYear = await prisma.schoolYear.findFirst({
    where: { isCurrent: true },
  });

  const phaseInfo = activeSchoolYear
    ? calculatePhase(activeSchoolYear, effectiveDate, isSimulated)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        phaseInfo={
          phaseInfo
            ? {
                phase: phaseInfo.phase,
                phaseName: phaseInfo.phaseName,
                isOpen: phaseInfo.isOpen,
                effectiveDate: phaseInfo.effectiveDate.toISOString(),
                isSimulationMode: phaseInfo.isSimulationMode,
              }
            : undefined
        }
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-900 bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200 w-fit">
              <Clock className="w-3.5 h-3.5" />
              <span>Admin Testing Tool</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              Time Travel / Date Simulation Controls
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Test how the system, workflows, validation, and read-only locks behave during different school year phases without altering the server clock.
            </p>
          </div>
        </div>

        <SimulationControlClient
          isSimulationMode={config?.isSimulationMode || false}
          simulatedDate={config?.simulatedDate ? config.simulatedDate.toISOString().slice(0, 10) : ''}
          currentPhaseName={phaseInfo?.phaseName || 'N/A'}
          effectiveDateString={effectiveDate.toISOString()}
        />
      </main>
    </div>
  );
}
