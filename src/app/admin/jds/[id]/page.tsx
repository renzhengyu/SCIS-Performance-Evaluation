import { getEffectiveSessionUser } from '@/lib/impersonate-actions';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import JDEditorClient from '../JDEditorClient';

export default async function EditJobDescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const effectiveSession = await getEffectiveSessionUser();
  if (!effectiveSession?.user?.email) redirect('/auth/signin');

  const { id } = await params;
  const userRole = effectiveSession.user.role;
  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN';

  const jd = await prisma.jobDescription.findUnique({
    where: { id },
    include: {
      staffProfiles: {
        select: { id: true, fullName: true, email: true, department: true, campus: true },
      },
      reportsToJd: {
        select: { id: true, title: true },
      },
    },
  });

  if (!jd) notFound();

  // All other JDs for the "Reports To" dropdown
  const allOtherJds = await prisma.jobDescription.findMany({
    where: { NOT: { id } },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  const config = await prisma.systemConfig.findUnique({
    where: { id: 'singleton' },
  });

  const globalFooterText =
    config?.standardJdFooterText ||
    'Shanghai Community International School is committed to safeguarding and promoting the welfare of children. All employees must pass comprehensive criminal record checks.';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        effectiveRole={userRole}
        effectiveName={effectiveSession.staffProfile?.fullName || effectiveSession.user.name}
      />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <JDEditorClient
          initialData={jd}
          allOtherJds={allOtherJds}
          globalFooterText={globalFooterText}
          readOnly={!isAdmin}
        />

        {/* List assigned staff (admin only) */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">
              Staff Members Assigned to this JD ({jd.staffProfiles.length})
            </h2>
            {jd.staffProfiles.length === 0 ? (
              <p className="text-xs text-slate-500">No staff members assigned to this JD yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {jd.staffProfiles.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{s.fullName}</span>
                      <span className="text-slate-500 block text-[11px]">{s.email}</span>
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      {s.campus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
