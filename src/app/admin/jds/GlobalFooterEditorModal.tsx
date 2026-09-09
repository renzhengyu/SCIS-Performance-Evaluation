'use client';

import { useState } from 'react';
import { updateStandardPolicyFooterAction } from './actions';
import { ShieldCheck, Save, X, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  initialFooterText: string;
}

export default function GlobalFooterEditorModal({ initialFooterText }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [footerText, setFooterText] = useState(initialFooterText);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateStandardPolicyFooterAction(footerText);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to update standard footer');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition cursor-pointer"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Standard Policy Footer</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold">Standard Policy Footer Settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                This policy statement automatically applies to the bottom of all school Job Descriptions and printed evaluation documents. Altering this updates the text schoolwide without modifying each JD manually.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Global Policy Statement *
                </label>
                <textarea
                  rows={4}
                  required
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              {success && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Standard policy footer saved successfully!</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded font-bold shadow disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Global Policy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
