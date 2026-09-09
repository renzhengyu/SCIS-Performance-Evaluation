'use client';

import { useState } from 'react';
import { stopImpersonationAction } from '@/lib/impersonate-actions';
import { Eye, LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  targetName: string;
  targetEmail: string;
  realUserName: string;
}

export default function StopImpersonateBanner({
  targetName,
  targetEmail,
  realUserName,
}: Props) {
  const router = useRouter();
  const [isStopping, setIsStopping] = useState(false);

  const handleStop = async () => {
    try {
      setIsStopping(true);
      await stopImpersonationAction();
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to stop impersonation');
      setIsStopping(false);
    }
  };

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 animate-pulse" />
        <span>
          Viewing as <span className="underline">{targetName}</span> ({targetEmail}) &bull; Logged in as{' '}
          <span className="opacity-90">{realUserName}</span>
        </span>
      </div>

      <button
        onClick={handleStop}
        disabled={isStopping}
        className="inline-flex items-center gap-1 bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
      >
        {isStopping ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span>Exit Impersonation</span>
      </button>
    </div>
  );
}
