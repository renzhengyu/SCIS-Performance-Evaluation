import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Navbar from '@/components/Navbar';
import JDEditorClient from '../JDEditorClient';

export default async function NewJobDescriptionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/auth/signin');

  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    redirect('/dashboard');
  }

  const allJDs = await prisma.jobDescription.findMany({
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
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JDEditorClient allOtherJds={allJDs} globalFooterText={globalFooterText} />
      </main>
    </div>
  );
}
