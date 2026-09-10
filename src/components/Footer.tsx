'use client';

import { APP_VERSION, getFormattedBuildTime } from '@/lib/version';

export default function Footer() {
  const formattedTime = getFormattedBuildTime();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>&copy; {new Date().getFullYear()} Shanghai Community International School. All rights reserved.</span>
        <span className="font-mono text-[11px] text-slate-400">
          v{APP_VERSION} &bull; Built: {formattedTime}
        </span>
      </div>
    </footer>
  );
}
