import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import StaffDirectoryClient from './StaffDirectoryClient';
import { Users } from 'lucide-react';

export default async function StaffAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    redirect('/dashboard');
  }

  const staffList = await prisma.staffProfile.findMany({
    include: {
      user: true,
      jobDescription: true,
      supervisor: true,
      deptHead: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const allJDs = await prisma.jobDescription.findMany({
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  const allStaffOptions = staffList.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    email: s.email,
  }));

  const { getOrgOptionsAction } = await import('./actions');
  const { campuses, departments } = await getOrgOptionsAction();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 w-fit">
            <Users className="w-3.5 h-3.5" />
            <span>Staff Directory & Roles</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Staff & Reporting Hierarchy ({staffList.length})
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Map staff members to their Job Descriptions, Supervisors, Department Heads, and Entra ID permissions.
          </p>
        </div>

        <StaffDirectoryClient
          staffList={staffList}
          allJDs={allJDs}
          allSupervisors={allStaffOptions}
          allDeptHeads={allStaffOptions}
          initialCampuses={campuses}
          initialDepartments={departments}
        />
      </main>
    </div>
  );
}
