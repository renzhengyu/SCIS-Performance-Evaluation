'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { ShieldCheck, LogIn, School, UserCheck } from 'lucide-react';

export default function SignInPage() {
  const [testEmail, setTestEmail] = useState('zren@scis-china.org');
  const [isLoading, setIsLoading] = useState(false);

  const handleEntraSignIn = () => {
    setIsLoading(true);
    signIn('azure-ad', { callbackUrl: '/dashboard' });
  };

  const handleQuickSignIn = (email: string) => {
    setIsLoading(true);
    signIn('dev-login', { email, callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900 text-white mb-4 shadow-md">
          <School className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Shanghai Community International School
        </h2>
        <p className="text-sm font-medium text-slate-600 mt-1">
          上海长宁国际外籍人员子女学校
        </p>
        <p className="text-sm text-slate-500 mt-2 font-medium">
          Staff Performance Evaluation Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-200 sm:rounded-xl sm:px-10 space-y-6">
          {/* Primary SSO Button */}
          <div>
            <button
              onClick={handleEntraSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-[#0078D4] hover:bg-[#0063B1] shadow transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              <span>Sign in with Microsoft 365 (Entra ID)</span>
            </button>
            <p className="text-xs text-center text-slate-500 mt-2">
              Use your official @scis-china.org school account
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold">
                Development & Testing Accounts
              </span>
            </div>
          </div>

          {/* Quick test role selector */}
          <div className="space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              Switch roles to verify workflows:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSignIn('zren@scis-china.org')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold">Zhengyu Ren (Super Admin)</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">zren@scis-china.org</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSignIn('hhuang@scis-china.org')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Harry Huang (Staff)</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">hhuang@scis-china.org</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSignIn('supervisor.tech@scis-china.org')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">Supervisor (Alex)</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">supervisor.tech@...</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSignIn('director.tech@scis-china.org')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition"
              >
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold">Dept Head (Sarah)</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">director.tech@...</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
