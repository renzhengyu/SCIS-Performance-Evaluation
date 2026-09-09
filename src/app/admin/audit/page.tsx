import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import { ShieldCheck } from 'lucide-react';
import AuditLogViewerClient from './AuditLogViewerClient';

export default async function AuditLogAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    redirect('/dashboard');
  }

  const logs = await prisma.auditLog.findMany({
    take: 300,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 w-fit">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Compliance & Accountability</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            System Audit Trail ({logs.length} events)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete, immutable log of modifications to Job Descriptions, staff assignments, evaluation forms, scores, impersonations, and PDF downloads.
          </p>
        </div>

        <AuditLogViewerClient
          logs={logs.map((l) => ({
            id: l.id,
            userId: l.userId,
            userEmail: l.userEmail,
            userName: l.userName,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            diffData: l.diffData,
            ipAddress: l.ipAddress,
            createdAt: l.createdAt.toISOString(),
          }))}
        />
      </main>
    </div>
  );
}
