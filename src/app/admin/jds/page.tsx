import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { FileText, Plus, Users, Calendar, ArrowRight } from 'lucide-react';

export default async function JobDescriptionsAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    redirect('/dashboard');
  }

  const jds = await prisma.jobDescription.findMany({
    include: {
      _count: {
        select: { staffProfiles: true },
      },
    },
    orderBy: { title: 'asc' },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 w-fit">
              <FileText className="w-3.5 h-3.5" />
              <span>Job Description Catalog</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              School Job Descriptions ({jds.length})
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, revise, and assign standardized job descriptions across staff roles.
            </p>
          </div>

          <Link
            href="/admin/jds/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New JD</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jds.map((jd) => {
            const responsibilities = Array.isArray(jd.responsibilities)
              ? (jd.responsibilities as string[])
              : [];

            return (
              <div
                key={jd.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900 leading-tight">
                      {jd.title}
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      <Users className="w-3 h-3 text-slate-500" />
                      {jd._count.staffProfiles} staff
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Reports to: <span className="font-semibold text-slate-700">{jd.reportsTo}</span>
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {jd.positionSummary}
                  </p>

                  <div className="text-[11px] font-medium text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span>{responsibilities.length} duties defined</span>
                    <span>Rev: {new Date(jd.lastRevisedDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <Link
                    href={`/admin/jds/${jd.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    <span>View & Edit JD</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
