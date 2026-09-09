'use client';

import { useState } from 'react';
import { startImpersonationAction } from '@/lib/impersonate-actions';
import { UserCheck, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  staffId: string;
  staffName: string;
}

export default function ImpersonateButton({ staffId, staffName }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleImpersonate = async () => {
    const confirmed = confirm(
      `Do you want to switch your view and impersonate ${staffName}? You can return to your original account at any time.`
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      await startImpersonationAction(staffId);
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to start impersonation');
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleImpersonate}
      disabled={isLoading}
      title={`Impersonate ${staffName}`}
      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-900 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded border border-purple-200 transition disabled:opacity-50 cursor-pointer"
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <UserCheck className="w-3.5 h-3.5 text-purple-700" />
      )}
      <span>Impersonate</span>
    </button>
  );
}
