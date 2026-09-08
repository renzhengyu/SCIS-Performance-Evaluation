'use client';

import { useState } from 'react';
import { updatePhaseDatesAction } from './actions';
import { Calendar, Save, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PhaseScheduleClientProps {
  schoolYear: any;
}

export default function PhaseScheduleClient({ schoolYear }: PhaseScheduleClientProps) {
  const router = useRouter();
  const [p1Start, setP1Start] = useState(schoolYear.phase1StartDate.toISOString().slice(0, 10));
  const [p1End, setP1End] = useState(schoolYear.phase1EndDate.toISOString().slice(0, 10));

  const [p2Start, setP2Start] = useState(schoolYear.phase2StartDate.toISOString().slice(0, 10));
  const [p2End, setP2End] = useState(schoolYear.phase2EndDate.toISOString().slice(0, 10));

  const [p3Start, setP3Start] = useState(schoolYear.phase3StartDate.toISOString().slice(0, 10));
  const [p3End, setP3End] = useState(schoolYear.phase3EndDate.toISOString().slice(0, 10));

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSuccessMsg(false);
      await updatePhaseDatesAction(schoolYear.id, {
        phase1StartDate: p1Start,
        phase1EndDate: p1End,
        phase2StartDate: p2Start,
        phase2EndDate: p2End,
        phase3StartDate: p3Start,
        phase3EndDate: p3End,
      });
      setSuccessMsg(true);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update phase dates');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>School year review dates updated successfully!</span>
        </div>
      )}

      {/* Phase 1 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Phase 1 Window
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-2">
            Responsibility, Goal & Weight Setting
          </h2>
          <p className="text-xs text-slate-500">
            Usually opens in September or October, due in 1–2 weeks. Staff & supervisors pick 4–8 duties (sum to 80) and 2–3 goals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Open Date</label>
            <input
              type="date"
              required
              value={p1Start}
              onChange={(e) => setP1Start(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Close Date</label>
            <input
              type="date"
              required
              value={p1End}
              onChange={(e) => setP1End(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>
        </div>
      </div>

      {/* Phase 2 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            Phase 2 Window
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-2">
            Mid-Year Review
          </h2>
          <p className="text-xs text-slate-500">
            Usually opens in January for 1–2 weeks. Staff reports goal progress, supervisor provides constructive feedback. No scoring.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Open Date</label>
            <input
              type="date"
              required
              value={p2Start}
              onChange={(e) => setP2Start(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Close Date</label>
            <input
              type="date"
              required
              value={p2End}
              onChange={(e) => setP2End(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>
        </div>
      </div>

      {/* Phase 3 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Phase 3 Window
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-2">
            Final Review, Scoring & Submission
          </h2>
          <p className="text-xs text-slate-500">
            Usually opens in April and closes on the last working day of April. Self & supervisor scoring (80+20) and sign-off.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Open Date</label>
            <input
              type="date"
              required
              value={p3Start}
              onChange={(e) => setP3Start(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Close Date</label>
            <input
              type="date"
              required
              value={p3End}
              onChange={(e) => setP3End(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Review Schedule'}</span>
        </button>
      </div>
    </form>
  );
}
