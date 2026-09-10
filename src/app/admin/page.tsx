import { getEffectiveSessionUser } from '@/lib/impersonate-actions';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  FileText,
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default async function AdminHubPage() {
  const effectiveSession = await getEffectiveSessionUser();
  if (!effectiveSession?.user?.email) redirect('/auth/signin');

  const userRole = effectiveSession.user.role;
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'HR_ADMIN') {
    redirect('/dashboard');
  }

  const adminSections = [
    {
      title: 'Job Descriptions (JDs)',
      desc: 'Catalog of school job descriptions, position summaries, bullet duties, and qualifications.',
      href: '/admin/jds',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      title: 'Staff Directory & Reporting Lines',
      desc: 'Map staff to their JD, direct supervisor, department head, and system permissions.',
      href: '/admin/staff',
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Phase Windows & Review Dates',
      desc: 'Set official open/close dates for Phase 1, Phase 2, and Phase 3 evaluation windows.',
      href: '/admin/phases',
      icon: Calendar,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      title: 'Time Travel / Simulation Mode',
      desc: 'Override system date to instantly test phase transitions and read-only behavior.',
      href: '/admin/simulation',
      icon: Clock,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
    {
      title: 'Audit Trail & Compliance Log',
      desc: 'Immutable log of every change, score edit, JD update, and PDF export.',
      href: '/admin/audit',
      icon: ShieldCheck,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        effectiveRole={userRole}
        effectiveName={effectiveSession.staffProfile?.fullName || effectiveSession.user.name}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 w-fit">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            HR & System Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure school parameters, manage job descriptions, monitor evaluation cycles, and view audit history.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <Link
                key={sec.href}
                href={sec.href}
                className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${sec.color} mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition">
                    {sec.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {sec.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-bold text-blue-900 group-hover:translate-x-1 transition">
                  <span>Open Settings</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
