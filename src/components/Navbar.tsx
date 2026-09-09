'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  School,
  LogOut,
  Calendar,
  FileText,
  Users,
  Briefcase,
  Clock,
  Shield,
  Activity,
} from 'lucide-react';

import StopImpersonateBanner from './StopImpersonateBanner';

interface NavbarProps {
  phaseInfo?: {
    phase: 1 | 2 | 3 | null;
    phaseName: string;
    isOpen: boolean;
    effectiveDate: string;
    isSimulationMode: boolean;
  };
  impersonationInfo?: {
    targetName: string;
    targetEmail: string;
    realUserName: string;
  } | null;
}

export default function Navbar({ phaseInfo, impersonationInfo }: NavbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const userRole = (session?.user as any)?.role || 'STAFF';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isHRAdmin = isSuperAdmin || userRole === 'HR_ADMIN';
  const isSupervisor = isHRAdmin || userRole === 'SUPERVISOR';
  const isDeptHead = isHRAdmin || userRole === 'DEPT_HEAD';

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: School, show: true },
    { href: '/evaluations/my', label: 'My Evaluation', icon: FileText, show: true },
    { href: '/evaluations/reports', label: 'Direct Reports', icon: Users, show: isSupervisor },
    { href: '/evaluations/dept', label: 'Department Reviews', icon: Briefcase, show: isDeptHead },
    { href: '/admin', label: 'Admin Center', icon: Shield, show: isHRAdmin },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Impersonation Warning Banner */}
      {impersonationInfo && (
        <StopImpersonateBanner
          targetName={impersonationInfo.targetName}
          targetEmail={impersonationInfo.targetEmail}
          realUserName={impersonationInfo.realUserName}
        />
      )}
      {/* Simulation Warning Banner */}
      {phaseInfo?.isSimulationMode && (
        <div className="bg-purple-700 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <Clock className="w-4 h-4 animate-pulse text-purple-200" />
            <span>
              <strong>Simulation Mode Active:</strong> System date is currently set to{' '}
              <span className="font-mono bg-purple-900 px-1.5 py-0.5 rounded text-purple-100">
                {new Date(phaseInfo.effectiveDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
          </div>
          <Link
            href="/admin/simulation"
            className="underline hover:text-purple-200 hidden sm:inline text-[11px]"
          >
            Adjust Date Settings &rarr;
          </Link>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & School Title */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white font-bold text-lg shadow group-hover:bg-blue-800 transition">
                SCIS
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                  Shanghai Community International School
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Staff Performance Evaluation System
                </div>
              </div>
            </Link>

            {/* Current Phase Indicator Badge */}
            {phaseInfo && (
              <div className="ml-4 hidden lg:flex items-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    phaseInfo.isOpen
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      phaseInfo.isOpen ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  {phaseInfo.phaseName}
                </span>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navLinks
              .filter((item) => item.show)
              .map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-900 border border-blue-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

            {/* User Profile & Sign Out */}
            {session?.user && (
              <div className="flex items-center gap-3 pl-3 ml-2 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {(session.user as any).fullName || session.user.name || session.user.email}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                    <span className="capitalize font-mono px-1 py-0.2 bg-slate-100 rounded text-slate-600">
                      {userRole.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  title="Sign out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
