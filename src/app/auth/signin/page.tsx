'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { School } from 'lucide-react';
import { APP_VERSION, getFormattedBuildTime } from '@/lib/version';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const formattedBuildTime = getFormattedBuildTime();

  const handleEntraSignIn = () => {
    setIsLoading(true);
    signIn('azure-ad', { callbackUrl: '/dashboard' });
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
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-lg text-sm font-semibold text-white bg-[#0078D4] hover:bg-[#0063B1] shadow transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              <span>Sign in with Microsoft 365 (Entra ID)</span>
            </button>
            <p className="text-xs text-center text-slate-500 mt-3">
              Use your official @scis-china.org school account
            </p>
          </div>
        </div>

        {/* Version & Build Time Note on Login Page */}
        <div className="mt-6 text-center text-xs text-slate-400 font-mono">
          <span>Version: v{APP_VERSION} &bull; Built: {formattedBuildTime}</span>
        </div>
      </div>
    </div>
  );
}
