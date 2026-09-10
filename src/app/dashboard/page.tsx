import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getActiveSchoolYearWithPhase } from '@/lib/date-service';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  Download,
  Calendar,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { calculateGrade } from '@/lib/scoring';
import { getEffectiveSessionUser } from '@/lib/impersonate-actions';

export default async function DashboardPage() {
  const effectiveSession = await getEffectiveSessionUser();

  if (!effectiveSession?.user?.email) {
    redirect('/auth/signin');
  }

  const user = effectiveSession.user as any;
  const staffProfile = effectiveSession.staffProfile;
  const impersonationInfo = effectiveSession.isImpersonating && effectiveSession.realUser
    ? {
        targetName: staffProfile?.fullName || user.name || user.email,
        targetEmail: staffProfile?.email || user.email,
        realUserName: effectiveSession.realUser.name || effectiveSession.realUser.email,
      }
    : null;

  const { schoolYear, phaseInfo } = await getActiveSchoolYearWithPhase();

  // Find or create current evaluation for this staff member
  let currentEvaluation = null;
  if (user?.staffProfile && schoolYear) {
    currentEvaluation = await prisma.evaluation.findFirst({
      where: {
        staffProfileId: user.staffProfile.id,
        schoolYearId: schoolYear.id,
      },
      include: {
        items: true,
        goals: true,
      },
    });
  }

  // Find direct reports if user is a supervisor
  let directReports: any[] = [];
  if (user?.staffProfile) {
    const subordinates = await prisma.staffProfile.findMany({
      where: { supervisorId: user.staffProfile.id },
      include: {
        user: true,
        jobDescription: true,
        evaluations: {
          where: { schoolYearId: schoolYear?.id || '' },
          include: { items: true },
        },
      },
    });
    directReports = subordinates;
  }

  // Find department reports if user is dept head
  let deptReports: any[] = [];
  if (user?.staffProfile) {
    deptReports = await prisma.staffProfile.findMany({
      where: { deptHeadId: user.staffProfile.id },
      include: {
        user: true,
        supervisor: true,
        evaluations: {
          where: { schoolYearId: schoolYear?.id || '' },
        },
      },
    });
  }

  const role = user?.role || 'STAFF';
  const isHR = role === 'SUPER_ADMIN' || role === 'HR_ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        impersonationInfo={impersonationInfo}
        phaseInfo={{
          phase: phaseInfo.phase,
          phaseName: phaseInfo.phaseName,
          isOpen: phaseInfo.isOpen,
          effectiveDate: phaseInfo.effectiveDate.toISOString(),
          isSimulationMode: phaseInfo.isSimulationMode,
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Academic Year Banner */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {schoolYear?.code || 'SY2627'} • {schoolYear?.name || 'School Year 2026 - 2027'}
              </span>
              {phaseInfo.isSimulationMode && (
                <span className="text-xs font-semibold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded border border-purple-200">
                  Simulation Date
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              Welcome, {user?.staffProfile?.fullName || user?.name || user?.email}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Position: <span className="font-semibold text-slate-800">{user?.staffProfile?.jobDescription?.title || 'Staff Member'}</span> &bull; Campus:{' '}
              <span className="font-semibold text-slate-800">{user?.staffProfile?.campus || 'Systemwide'}</span> &bull; Department:{' '}
              <span className="font-semibold text-slate-800">{user?.staffProfile?.department || 'General'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user?.staffProfile?.jobDescription && (
              <Link
                href={`/admin/jds/${user.staffProfile.jobDescription.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>View My Job Description</span>
              </Link>
            )}

            {isHR && (
              <Link
                href="/admin/simulation"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition"
              >
                <Clock className="w-4 h-4" />
                <span>Simulation / Time Travel</span>
              </Link>
            )}
          </div>
        </div>

        {/* Phase Timeline Tracker */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Evaluation Cycle Schedule</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase 1 */}
            <div
              className={`rounded-lg border p-4 transition ${
                phaseInfo.phase === 1
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Phase 1
                </span>
                {phaseInfo.phase === 1 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded-full">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mt-1">
                Goal & Responsibility Setting
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Select 4–8 duties (sum to 80 pts) & 2–3 goals
              </p>
              <div className="text-[11px] font-mono text-slate-600 mt-3 pt-2 border-t border-slate-200">
                {schoolYear?.phase1StartDate
                  ? `${new Date(schoolYear.phase1StartDate).toLocaleDateString()} - ${new Date(
                      schoolYear.phase1EndDate
                    ).toLocaleDateString()}`
                  : 'Sep/Oct'}
              </div>
            </div>

            {/* Phase 2 */}
            <div
              className={`rounded-lg border p-4 transition ${
                phaseInfo.phase === 2
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Phase 2
                </span>
                {phaseInfo.phase === 2 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded-full">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mt-1">
                Mid-Year Review
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Progress reflections & supervisor feedback
              </p>
              <div className="text-[11px] font-mono text-slate-600 mt-3 pt-2 border-t border-slate-200">
                {schoolYear?.phase2StartDate
                  ? `${new Date(schoolYear.phase2StartDate).toLocaleDateString()} - ${new Date(
                      schoolYear.phase2EndDate
                    ).toLocaleDateString()}`
                  : 'January'}
              </div>
            </div>

            {/* Phase 3 */}
            <div
              className={`rounded-lg border p-4 transition ${
                phaseInfo.phase === 3
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Phase 3
                </span>
                {phaseInfo.phase === 3 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded-full">
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mt-1">
                Final Review & Submission
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Self & supervisor scoring (80+20) & PDF sign-off
              </p>
              <div className="text-[11px] font-mono text-slate-600 mt-3 pt-2 border-t border-slate-200">
                {schoolYear?.phase3StartDate
                  ? `${new Date(schoolYear.phase3StartDate).toLocaleDateString()} - ${new Date(
                      schoolYear.phase3EndDate
                    ).toLocaleDateString()}`
                  : 'April'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: My Own Evaluation Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                My Performance Form
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {schoolYear?.code} Annual Evaluation
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Supervisor:{' '}
                <span className="font-semibold text-slate-800">
                  {user?.staffProfile?.supervisor?.fullName || 'Not assigned'}
                </span>{' '}
                &bull; Dept Head:{' '}
                <span className="font-semibold text-slate-800">
                  {user?.staffProfile?.deptHead?.fullName || 'Not assigned'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {currentEvaluation ? (
                <>
                  <Link
                    href={`/evaluations/${currentEvaluation.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition cursor-pointer"
                  >
                    <span>Open Evaluation Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <a
                    href={`/api/evaluations/${currentEvaluation.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Download 2-Page PDF</span>
                  </a>
                </>
              ) : (
                <Link
                  href="/evaluations/my"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition"
                >
                  <span>Start Phase 1 Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {currentEvaluation && (
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Form Status</div>
                <div className="text-sm font-bold text-slate-800 mt-1 font-mono">
                  {currentEvaluation.status.replace('_', ' ')}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">
                  Responsibilities
                </div>
                <div className="text-sm font-bold text-slate-800 mt-1">
                  {currentEvaluation.items.filter((i: any) => i.itemType === 'RESPONSIBILITY').length} / 8 items
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Goals Set</div>
                <div className="text-sm font-bold text-slate-800 mt-1">
                  {currentEvaluation.goals.length} Goals
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Score</div>
                <div className="text-sm font-bold text-blue-900 mt-1">
                  {currentEvaluation.totalScoreSupervisor ?? currentEvaluation.totalScoreSelf ?? '--'} / 100
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Direct Reports (If Supervisor) */}
        {directReports.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Direct Reports ({directReports.length})</h2>
                <p className="text-xs text-slate-500">
                  Staff members whose performance reviews you supervise
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Job Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {directReports.map((report) => {
                    const evalRecord = report.evaluations[0];
                    return (
                      <tr key={report.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {report.fullName}
                          <div className="text-xs text-slate-400 font-normal">{report.email}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {report.jobDescription?.title || 'No JD assigned'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {evalRecord ? evalRecord.status.replace('_', ' ') : 'Not Started'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {evalRecord ? (
                            <Link
                              href={`/evaluations/${evalRecord.id}`}
                              className="text-xs font-semibold text-blue-900 hover:text-blue-700 underline"
                            >
                              Review &rarr;
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Awaiting creation</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: Admin Quick Actions (If HR / Super Admin) */}
        {isHR && (
          <div className="bg-slate-900 text-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>HR & System Administration</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Centralized control for JDs, staff hierarchy, review windows, and audit records
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <Link
                href="/admin/jds"
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-4 rounded-lg transition group"
              >
                <div className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 flex items-center justify-between">
                  <span>Job Descriptions (JDs)</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Manage JD catalog, duties & bullet items
                </p>
              </Link>

              <Link
                href="/admin/staff"
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-4 rounded-lg transition group"
              >
                <div className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 flex items-center justify-between">
                  <span>Staff & Hierarchy</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Assign JDs, supervisors & department heads
                </p>
              </Link>

              <Link
                href="/admin/phases"
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-4 rounded-lg transition group"
              >
                <div className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 flex items-center justify-between">
                  <span>Phase Windows</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Configure Phase 1, 2, and 3 open/close dates
                </p>
              </Link>

              <Link
                href="/admin/audit"
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-4 rounded-lg transition group"
              >
                <div className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 flex items-center justify-between">
                  <span>Audit Trail</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Immutable modification history & diffs
                </p>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
