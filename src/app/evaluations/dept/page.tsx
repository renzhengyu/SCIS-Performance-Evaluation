import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getActiveSchoolYearWithPhase } from '@/lib/date-service';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Briefcase, Download, ArrowRight } from 'lucide-react';

export default async function DeptReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    include: { staffProfile: true },
  });

  if (!user?.staffProfile) {
    redirect('/dashboard');
  }

  const { schoolYear, phaseInfo } = await getActiveSchoolYearWithPhase();

  const deptStaff = await prisma.staffProfile.findMany({
    where: { deptHeadId: user.staffProfile.id },
    include: {
      supervisor: true,
      jobDescription: true,
      evaluations: {
        where: { schoolYearId: schoolYear?.id || '' },
      },
    },
    orderBy: { fullName: 'asc' },
  });

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200 w-fit">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Department Head Sign-Off</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              Department Staff Evaluations
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Active School Year: <span className="font-semibold text-slate-700">{schoolYear?.code}</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Job Title</th>
                <th className="py-3.5 px-4">Supervisor</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Score / Grade</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deptStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    No department staff assigned under your department head role.
                  </td>
                </tr>
              ) : (
                deptStaff.map((staff) => {
                  const ev = staff.evaluations[0];
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4 font-semibold text-slate-900">
                        {staff.fullName}
                        <div className="text-xs text-slate-500 font-normal">{staff.email}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {staff.jobDescription?.title || 'No JD assigned'}
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-xs">
                        {staff.supervisor?.fullName || 'None'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {ev ? ev.status.replace('_', ' ') : 'Not Started'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {ev?.totalScoreSupervisor ? (
                          <span className="font-semibold text-slate-900">
                            {ev.totalScoreSupervisor} / 100 ({ev.assessmentGrade || 'A'})
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        {ev ? (
                          <>
                            <Link
                              href={`/evaluations/${ev.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-900 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded border border-indigo-200"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              href={`/api/evaluations/${ev.id}/pdf`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 px-2 py-1.5 rounded border border-slate-200"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Link>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not created yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
