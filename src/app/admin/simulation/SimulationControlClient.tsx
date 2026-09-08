'use client';

import { useState } from 'react';
import { updateSimulationDateAction } from './actions';
import { Calendar, CheckCircle2, RotateCcw, FastForward, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  isSimulationMode: boolean;
  simulatedDate: string;
  currentPhaseName: string;
  effectiveDateString: string;
}

export default function SimulationControlClient({
  isSimulationMode: initialIsSim,
  simulatedDate: initialSimDate,
  currentPhaseName,
  effectiveDateString,
}: Props) {
  const router = useRouter();
  const [isSimMode, setIsSimMode] = useState(initialIsSim);
  const [selectedDate, setSelectedDate] = useState(initialSimDate || '2026-10-01');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSave = async (overrideSimMode?: boolean, overrideDate?: string) => {
    try {
      setIsSaving(true);
      setStatusMsg(null);

      const targetSim = overrideSimMode !== undefined ? overrideSimMode : isSimMode;
      const targetDate = overrideDate !== undefined ? overrideDate : selectedDate;

      await updateSimulationDateAction({
        isSimulationMode: targetSim,
        simulatedDate: targetDate,
      });

      setStatusMsg('Date configuration updated successfully!');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error updating date configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const jumpToPreset = (dateString: string, label: string) => {
    setIsSimMode(true);
    setSelectedDate(dateString);
    handleSave(true, dateString);
  };

  const resetToReal = () => {
    setIsSimMode(false);
    handleSave(false, null as any);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Current Effective System State */}
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Currently Effective System Date
          </div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 font-mono">
            {new Date(effectiveDateString).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            Current Phase Evaluation State:{' '}
            <span className="font-semibold text-blue-900">{currentPhaseName}</span>
          </div>
        </div>

        <div>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              isSimMode
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {isSimMode ? 'Simulated Time Active' : 'Real Server Clock'}
          </span>
        </div>
      </div>

      {/* Quick Phase Presets */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          One-Click Phase Fast-Forward Presets:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => jumpToPreset('2026-10-01', 'Phase 1')}
            className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition"
          >
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span>Phase 1 Setting</span>
              <FastForward className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-600 mt-1">Oct 1, 2026</div>
            <div className="text-[10px] text-slate-500">Goal & weight setup window</div>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => jumpToPreset('2027-01-15', 'Phase 2')}
            className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-left transition"
          >
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
              <span>Phase 2 Mid-Year</span>
              <FastForward className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-600 mt-1">Jan 15, 2027</div>
            <div className="text-[10px] text-slate-500">Progress reflection & feedback</div>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => jumpToPreset('2027-04-20', 'Phase 3')}
            className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition"
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span>Phase 3 Final</span>
              <FastForward className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-600 mt-1">Apr 20, 2027</div>
            <div className="text-[10px] text-slate-500">Final scores, grades & sign-off</div>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => jumpToPreset('2027-05-15', 'Closed Window')}
            className="p-3 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-left transition"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Closed Window</span>
              <FastForward className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-600 mt-1">May 15, 2027</div>
            <div className="text-[10px] text-slate-500">Read-only view testing</div>
          </button>
        </div>
      </div>

      {/* Manual Date Input */}
      <div className="pt-4 border-t border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Manual Simulation Override
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="simToggle"
              checked={isSimMode}
              onChange={(e) => setIsSimMode(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="simToggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Enable Simulated Date
            </label>
          </div>
        </div>

        {isSimMode && (
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave()}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow transition disabled:opacity-50"
            >
              Apply Date
            </button>
          </div>
        )}
      </div>

      {/* Reset to Actual Clock */}
      <div className="pt-4 border-t border-slate-200 flex justify-end">
        <button
          type="button"
          disabled={isSaving || !isSimMode}
          onClick={resetToReal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Real Server Clock</span>
        </button>
      </div>
    </div>
  );
}
