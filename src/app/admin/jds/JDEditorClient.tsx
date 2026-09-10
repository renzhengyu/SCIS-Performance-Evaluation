'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveJobDescriptionAction } from './actions';
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import JDUploadModal from './JDUploadModal';
import { ParsedJobDescription } from '@/lib/jd-doc-parser';

interface JDEditorClientProps {
  initialData?: any;
  allOtherJds: { id: string; title: string }[];
  globalFooterText: string;
}

export default function JDEditorClient({
  initialData,
  allOtherJds,
  globalFooterText,
}: JDEditorClientProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || '');
  const [reportsToJdId, setReportsToJdId] = useState(initialData?.reportsToJdId || '');
  const [positionSummary, setPositionSummary] = useState(initialData?.positionSummary || '');

  const [responsibilities, setResponsibilities] = useState<string[]>(
    Array.isArray(initialData?.responsibilities) && initialData.responsibilities.length > 0
      ? initialData.responsibilities
      : ['']
  );

  const [skillsAttributes, setSkillsAttributes] = useState<string[]>(
    Array.isArray(initialData?.skillsAttributes) && initialData.skillsAttributes.length > 0
      ? initialData.skillsAttributes
      : ['']
  );

  const [qualifications, setQualifications] = useState<string[]>(
    Array.isArray(initialData?.qualifications) && initialData.qualifications.length > 0
      ? initialData.qualifications
      : ['']
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);

  const applyParsedData = (data: ParsedJobDescription) => {
    if (data.title) setTitle(data.title);
    if (data.reportsToJdId) {
      setReportsToJdId(data.reportsToJdId);
    }
    if (data.positionSummary) setPositionSummary(data.positionSummary);
    if (Array.isArray(data.responsibilities) && data.responsibilities.length > 0) {
      setResponsibilities(data.responsibilities);
    }
    if (Array.isArray(data.skillsAttributes) && data.skillsAttributes.length > 0) {
      setSkillsAttributes(data.skillsAttributes);
    }
    if (Array.isArray(data.qualifications) && data.qualifications.length > 0) {
      setQualifications(data.qualifications);
    }
    setParseNotice(
      `Document parsed successfully! Extracted title, position summary, responsibilities, skills, and qualifications. Please review below and save.`
    );
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('pendingParsedJd');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          applyParsedData(parsed);
          sessionStorage.removeItem('pendingParsedJd');
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleListChange = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, '']);
  };

  const removeListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto resize helper for textareas
  const autoResize = (target: HTMLTextAreaElement | null) => {
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${Math.max(38, target.scrollHeight)}px`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please fill in the Job Title.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSavedSuccess(false);

      const res = await saveJobDescriptionAction(initialData?.id || null, {
        title,
        reportsToJdId: reportsToJdId || null,
        positionSummary,
        responsibilities,
        skillsAttributes,
        qualifications,
      });

      setSavedSuccess(true);
      if (!initialData?.id) {
        router.push(`/admin/jds/${res.id}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save job description');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/jds"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to JD Catalog</span>
        </Link>

        <div className="flex items-center gap-2">
          <JDUploadModal onParsed={applyParsedData} />

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Job Description'}</span>
          </button>
        </div>
      </div>

      {parseNotice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-700 flex-shrink-0" />
            <span>{parseNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setParseNotice(null)}
            className="text-blue-700 hover:text-blue-950 text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Job Description saved successfully!</span>
        </div>
      )}

      {/* Basic Metadata */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Position Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title * (Must be Unique)
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Apple Hardware Specialist"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reports To (Supervisor Job Description)
            </label>
            <select
              value={reportsToJdId}
              onChange={(e) => setReportsToJdId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 font-medium bg-white"
            >
              <option value="">-- None / Head of School / Top-Level --</option>
              {allOtherJds.map((jd) => (
                <option key={jd.id} value={jd.id}>
                  {jd.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Select the supervisor's position from existing Job Descriptions.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Position Summary
          </label>
          <textarea
            rows={3}
            value={positionSummary}
            ref={autoResize}
            onChange={(e) => {
              setPositionSummary(e.target.value);
              autoResize(e.target);
            }}
            placeholder="High-level purpose and scope of the role..."
            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500 resize-y"
          />
        </div>
      </div>

      {/* Major Responsibilities and Duties */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Major Responsibilities and Duties
            </h2>
            <p className="text-xs text-slate-500">
              Staff and supervisors will select 4–8 of these items during Phase 1 evaluation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => addListItem(setResponsibilities)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Duty</span>
          </button>
        </div>

        <div className="space-y-3">
          {responsibilities.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs font-bold text-slate-400 w-6 text-center mt-2.5">
                {idx + 1}.
              </span>
              <textarea
                rows={1}
                value={item}
                ref={autoResize}
                onChange={(e) => {
                  handleListChange(setResponsibilities, idx, e.target.value);
                  autoResize(e.target);
                }}
                placeholder="Enter responsibility bullet point (auto-expands for long descriptions)..."
                className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
              />
              <button
                type="button"
                onClick={() => removeListItem(setResponsibilities, idx)}
                className="p-2 text-slate-400 hover:text-rose-600 transition mt-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Skills and Attributes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Skills / Attributes
            </h2>
            <p className="text-xs text-slate-500">Bullet points of required capabilities.</p>
          </div>
          <button
            type="button"
            onClick={() => addListItem(setSkillsAttributes)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Skill</span>
          </button>
        </div>

        <div className="space-y-3">
          {skillsAttributes.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs font-bold text-slate-400 w-6 text-center mt-2.5">
                &bull;
              </span>
              <textarea
                rows={1}
                value={item}
                ref={autoResize}
                onChange={(e) => {
                  handleListChange(setSkillsAttributes, idx, e.target.value);
                  autoResize(e.target);
                }}
                placeholder="e.g. Strong diagnostic and communication skills..."
                className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
              />
              <button
                type="button"
                onClick={() => removeListItem(setSkillsAttributes, idx)}
                className="p-2 text-slate-400 hover:text-rose-600 transition mt-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Qualifications */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Qualifications
            </h2>
            <p className="text-xs text-slate-500">Degrees, certifications, and experience.</p>
          </div>
          <button
            type="button"
            onClick={() => addListItem(setQualifications)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Qualification</span>
          </button>
        </div>

        <div className="space-y-3">
          {qualifications.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs font-bold text-slate-400 w-6 text-center mt-2.5">
                &bull;
              </span>
              <textarea
                rows={1}
                value={item}
                ref={autoResize}
                onChange={(e) => {
                  handleListChange(setQualifications, idx, e.target.value);
                  autoResize(e.target);
                }}
                placeholder="e.g. Bachelor's in Computer Science, Apple certification..."
                className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
              />
              <button
                type="button"
                onClick={() => removeListItem(setQualifications, idx)}
                className="p-2 text-slate-400 hover:text-rose-600 transition mt-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Centralized Standard Policy Footer (Read-Only Preview) */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Global Standard Policy Footer (Managed Centrally)</span>
        </div>
        <p className="text-xs text-slate-500">
          This policy statement automatically appears on all official SCIS Job Descriptions. It cannot be altered per JD to maintain schoolwide compliance.
        </p>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 italic leading-relaxed">
          "{globalFooterText}"
        </div>
      </div>
    </form>
  );
}
