'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveJobDescriptionAction } from './actions';
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface JDEditorClientProps {
  initialData?: any;
}

export default function JDEditorClient({ initialData }: JDEditorClientProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || '');
  const [reportsTo, setReportsTo] = useState(initialData?.reportsTo || '');
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

  const [fixedFooterText, setFixedFooterText] = useState(
    initialData?.fixedFooterText ||
      'Shanghai Community International School is committed to safeguarding and promoting the welfare of children. All employees must pass comprehensive criminal record checks.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reportsTo.trim()) {
      alert('Please fill in Job Title and Reports To.');
      return;
    }

    try {
      setIsSaving(true);
      setSavedSuccess(false);

      const res = await saveJobDescriptionAction(initialData?.id || null, {
        title,
        reportsTo,
        positionSummary,
        responsibilities,
        skillsAttributes,
        qualifications,
        fixedFooterText,
      });

      setSavedSuccess(true);
      if (!initialData?.id) {
        router.push(`/admin/jds/${res.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save job description');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/jds"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to JD Catalog</span>
        </Link>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Job Description'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
              Job Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Apple Hardware Specialist"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reports To *
            </label>
            <input
              type="text"
              required
              value={reportsTo}
              onChange={(e) => setReportsTo(e.target.value)}
              placeholder="e.g. Director of Technology and Innovation"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Position Summary
          </label>
          <textarea
            rows={3}
            value={positionSummary}
            onChange={(e) => setPositionSummary(e.target.value)}
            placeholder="High-level purpose and scope of the role..."
            className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500"
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
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Duty</span>
          </button>
        </div>

        <div className="space-y-2">
          {responsibilities.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 w-6 text-center">
                {idx + 1}.
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => handleListChange(setResponsibilities, idx, e.target.value)}
                placeholder="Enter responsibility bullet point..."
                className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeListItem(setResponsibilities, idx)}
                className="p-2 text-slate-400 hover:text-rose-600 transition"
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
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Skill</span>
          </button>
        </div>

        <div className="space-y-2">
          {skillsAttributes.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 w-6 text-center">
                &bull;
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => handleListChange(setSkillsAttributes, idx, e.target.value)}
                placeholder="e.g. Strong diagnostic skills for micro-soldering..."
                className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeListItem(setSkillsAttributes, idx)}
                className="p-2 text-slate-400 hover:text-rose-600 transition"
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
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Qualification</span>
          </button>
        </div>

        <div className="space-y-2">
          {qualifications.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 w-6 text-center">
                &bull;
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => handleListChange(setQualifications, idx, e.target.value)}
                placeholder="e.g. Bachelor's in Computer Science..."
                className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeListItem(setQualifications, idx)}
                className="p-2 text-slate-400 hover:text-rose-600 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed Footer Text */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Standard Policy Footer (Applicable to all SCIS JDs)
        </h2>
        <textarea
          rows={2}
          value={fixedFooterText}
          onChange={(e) => setFixedFooterText(e.target.value)}
          className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </form>
  );
}
