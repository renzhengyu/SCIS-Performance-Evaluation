import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import PhaseScheduleClient from './PhaseScheduleClient';
import { Calendar } from 'lucide-react';

export default async function PhasesAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    redirect('/dashboard');
  }

  const schoolYear = await prisma.schoolYear.findFirst({
    where: { isCurrent: true },
  });

  if (!schoolYear) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="max-w-4xl mx-auto p-8 text-center text-slate-500">
          No current school year configured.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 w-fit">
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Cycle Dates</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Evaluation Phase Windows ({schoolYear.code})
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Specify open and close dates for all 3 phases. Outside these active windows, non-admin users only have read-only viewing access.
          </p>
        </div>

        <PhaseScheduleClient schoolYear={schoolYear} />
      </main>
    </div>
  );
}
