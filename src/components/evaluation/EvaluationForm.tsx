'use client';

import { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Save,
  Send,
  HelpCircle,
  Award,
} from 'lucide-react';
import { SKILL_RUBRICS, calculateGrade } from '@/lib/scoring';
import { savePhase1Action, savePhase2Action, savePhase3Action } from '@/app/evaluations/[id]/actions';
import Link from 'next/link';

interface EvaluationFormProps {
  evaluation: any;
  currentPhaseInfo: {
    phase: 1 | 2 | 3 | null;
    phaseName: string;
    isOpen: boolean;
    effectiveDate: string;
    isSimulationMode: boolean;
  };
  currentUser: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  };
  availableJDResponsibilities: string[];
}

export default function EvaluationForm({
  evaluation,
  currentPhaseInfo,
  currentUser,
  availableJDResponsibilities,
}: EvaluationFormProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'ALL'>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Role permissions
  const isStaff = evaluation.staffProfile.email.toLowerCase() === currentUser.email.toLowerCase();
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === currentUser.email.toLowerCase();
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HR_ADMIN';
  const canEditGeneral = isStaff || isSupervisor || isAdmin;

  // Phase editability
  const isPhase1Editable = isAdmin || (currentPhaseInfo.isOpen && currentPhaseInfo.phase === 1 && canEditGeneral);
  const isPhase2Editable = isAdmin || (currentPhaseInfo.isOpen && currentPhaseInfo.phase === 2 && canEditGeneral);
  const isPhase3Editable = isAdmin || (currentPhaseInfo.isOpen && currentPhaseInfo.phase === 3 && canEditGeneral);

  // Phase 1 State: Responsibilities & Weights
  const initialResponsibilities = evaluation.items
    .filter((i: any) => i.itemType === 'RESPONSIBILITY')
    .map((i: any) => ({
      id: i.id,
      title: i.title,
      weight: i.weight || 10,
      scoreSelf: i.scoreSelf,
      scoreSupervisor: i.scoreSupervisor,
    }));

  const [selectedResponsibilities, setSelectedResponsibilities] = useState<{
    id?: string;
    title: string;
    weight: number;
    scoreSelf?: number | null;
    scoreSupervisor?: number | null;
  }[]>(initialResponsibilities.length > 0 ? initialResponsibilities : []);

  // Phase 1 State: Goals
  const initialGoals = [
    { goalIndex: 1, description: evaluation.goals.find((g: any) => g.goalIndex === 1)?.description || '' },
    { goalIndex: 2, description: evaluation.goals.find((g: any) => g.goalIndex === 2)?.description || '' },
    { goalIndex: 3, description: evaluation.goals.find((g: any) => g.goalIndex === 3)?.description || '' },
  ];
  const [goals, setGoals] = useState(initialGoals);

  // Section C State: Development
  const [devRequestEmployee, setDevRequestEmployee] = useState(evaluation.devRequestEmployee || '');
  const [devRequestSupervisor, setDevRequestSupervisor] = useState(evaluation.devRequestSupervisor || '');
  const [otherCommentsEmployee, setOtherCommentsEmployee] = useState(evaluation.otherCommentsEmployee || '');
  const [otherCommentsSupervisor, setOtherCommentsSupervisor] = useState(evaluation.otherCommentsSupervisor || '');

  // Section E State: Mid Year
  const [midYearEmployee, setMidYearEmployee] = useState(evaluation.midYearCommentsEmployee || '');
  const [midYearSupervisor, setMidYearSupervisor] = useState(evaluation.midYearCommentsSupervisor || '');

  // Section F State: End of Year
  const [finalCommentsEmployee, setFinalCommentsEmployee] = useState(evaluation.finalCommentsEmployee || '');
  const [finalCommentsSupervisor, setFinalCommentsSupervisor] = useState(evaluation.finalCommentsSupervisor || '');

  // Skills items
  const initialSkills = evaluation.items
    .filter((i: any) => i.itemType === 'SKILL')
    .map((i: any) => ({
      id: i.id,
      title: i.title,
      weight: 5,
      scoreSelf: i.scoreSelf,
      scoreSupervisor: i.scoreSupervisor,
    }));
  const [skillItems, setSkillItems] = useState(initialSkills);

  // Rubric toggle
  const [expandedRubric, setExpandedRubric] = useState<string | null>(null);

  // Calculations
  const totalWeightA = selectedResponsibilities.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const isWeightValid = totalWeightA === 80;
  const isCountValid = selectedResponsibilities.length >= 4 && selectedResponsibilities.length <= 8;

  const totalPartASelf = selectedResponsibilities.reduce((sum, r) => sum + (Number(r.scoreSelf) || 0), 0);
  const totalPartASupervisor = selectedResponsibilities.reduce((sum, r) => sum + (Number(r.scoreSupervisor) || 0), 0);

  const totalPartBSelf = skillItems.reduce((sum: number, s: any) => sum + (Number(s.scoreSelf) || 0), 0);
  const totalPartBSupervisor = skillItems.reduce((sum: number, s: any) => sum + (Number(s.scoreSupervisor) || 0), 0);

  const liveTotalScoreSelf = totalPartASelf + totalPartBSelf;
  const liveTotalScoreSupervisor = totalPartASupervisor + totalPartBSupervisor;

  const currentGrade = calculateGrade(liveTotalScoreSupervisor);

  // Handlers for Phase 1
  const toggleSelectDuty = (dutyText: string) => {
    if (!isPhase1Editable) return;
    if (selectedResponsibilities.some((r) => r.title === dutyText)) {
      setSelectedResponsibilities(selectedResponsibilities.filter((r) => r.title !== dutyText));
    } else {
      if (selectedResponsibilities.length >= 8) {
        alert('Maximum of 8 responsibilities allowed.');
        return;
      }
      setSelectedResponsibilities([
        ...selectedResponsibilities,
        { title: dutyText, weight: 10, scoreSelf: null, scoreSupervisor: null },
      ]);
    }
  };

  const handleWeightChange = (title: string, weight: number) => {
    setSelectedResponsibilities((prev) =>
      prev.map((item) => (item.title === title ? { ...item, weight: Math.max(1, Math.min(20, weight)) } : item))
    );
  };

  const handleScoreChange = (
    itemId: string,
    type: 'RESPONSIBILITY' | 'SKILL',
    field: 'scoreSelf' | 'scoreSupervisor',
    value: number
  ) => {
    if (type === 'RESPONSIBILITY') {
      setSelectedResponsibilities((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
      );
    } else {
      setSkillItems((prev: any[]) =>
        prev.map((item: any) => (item.id === itemId ? { ...item, [field]: value } : item))
      );
    }
  };

  // Submission actions
  const handleSavePhase1 = async (isSubmitting = false) => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await savePhase1Action(evaluation.id, {
        responsibilities: selectedResponsibilities.map((r) => ({
          title: r.title,
          weight: Number(r.weight),
        })),
        goals: goals.filter((g) => g.description.trim() !== ''),
        devRequestEmployee,
        devRequestSupervisor,
        otherCommentsEmployee,
        otherCommentsSupervisor,
        isSubmitting,
      });

      setSuccessMessage(
        isSubmitting
          ? 'Phase 1 goals and responsibilities successfully submitted!'
          : 'Phase 1 draft saved successfully.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving Phase 1');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhase2 = async (isSubmitting = false) => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await savePhase2Action(evaluation.id, {
        midYearCommentsEmployee: midYearEmployee,
        midYearCommentsSupervisor: midYearSupervisor,
        isSubmitting,
      });

      setSuccessMessage(
        isSubmitting
          ? 'Phase 2 mid-year review comments submitted!'
          : 'Phase 2 draft saved successfully.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving Phase 2');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhase3 = async (submissionType?: 'self' | 'supervisor') => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const allScores = [
        ...selectedResponsibilities
          .filter((r) => r.id)
          .map((r) => ({
            id: r.id!,
            scoreSelf: r.scoreSelf !== null && r.scoreSelf !== undefined ? Number(r.scoreSelf) : null,
            scoreSupervisor:
              r.scoreSupervisor !== null && r.scoreSupervisor !== undefined ? Number(r.scoreSupervisor) : null,
          })),
        ...skillItems.map((s: any) => ({
          id: s.id,
          scoreSelf: s.scoreSelf !== null && s.scoreSelf !== undefined ? Number(s.scoreSelf) : null,
          scoreSupervisor:
            s.scoreSupervisor !== null && s.scoreSupervisor !== undefined ? Number(s.scoreSupervisor) : null,
        })),
      ];

      await savePhase3Action(evaluation.id, {
        itemScores: allScores,
        finalCommentsEmployee,
        finalCommentsSupervisor,
        isSelfSubmission: submissionType === 'self',
        isFinalSupervisorSubmission: submissionType === 'supervisor',
      });

      setSuccessMessage(
        submissionType === 'supervisor'
          ? 'Final evaluation completed and submitted!'
          : submissionType === 'self'
          ? 'Self-evaluation scores submitted successfully!'
          : 'Phase 3 scores saved.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving Phase 3');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Notifications */}
      {errorMessage && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-sm text-rose-800 font-medium">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-500 hover:text-emerald-700 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Official Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">
              {evaluation.schoolYear.code} Performance Evaluation
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-1">
              {evaluation.staffNameSnapshot}
            </h1>
            <p className="text-sm text-blue-100 mt-1">
              Position: <span className="font-semibold text-white">{evaluation.jobTitleSnapshot}</span> &bull; Campus:{' '}
              <span className="font-semibold text-white">{evaluation.campusSnapshot}</span> &bull; Department:{' '}
              <span className="font-semibold text-white">{evaluation.departmentSnapshot}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/api/evaluations/${evaluation.id}/pdf`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition"
            >
              <Download className="w-4 h-4 text-blue-900" />
              <span>Download Signed A4 PDF</span>
            </Link>

            <Link
              href={`/evaluations/${evaluation.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-100 bg-blue-800/80 hover:bg-blue-800 rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Preview</span>
            </Link>
          </div>
        </div>

        {/* Form Meta Status Bar */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500">Status:</span>{' '}
              <span className="font-semibold font-mono text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded">
                {evaluation.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Supervisor:</span>{' '}
              <span className="font-semibold text-slate-800">
                {evaluation.supervisor?.fullName || 'Unassigned'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Dept Head:</span>{' '}
              <span className="font-semibold text-slate-800">
                {evaluation.deptHead?.fullName || 'Unassigned'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Your role on this form:</span>
            <span className="font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
              {isStaff ? 'Employee (Self)' : isSupervisor ? 'Supervisor' : isAdmin ? 'Admin' : 'Viewer'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION A: Responsibilities */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
                A
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Responsibilities & Duties (Max 80 Points)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select 4–8 duties from the official Job Description. Each item has a maximum weight of 20. Total weight across all items must strictly equal 80.
            </p>
          </div>

          {/* Weight Counter Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                isWeightValid && isCountValid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              <span>Selected: {selectedResponsibilities.length} / 8</span>
              <span>&bull;</span>
              <span>Weight: {totalWeightA} / 80</span>
              {isWeightValid && isCountValid ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
            </div>
          </div>
        </div>

        {/* Phase 1 Duty Selector (if editable) */}
        {isPhase1Editable && availableJDResponsibilities.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Available Responsibilities from Job Description ({availableJDResponsibilities.length}):
            </div>
            <p className="text-xs text-slate-500">
              Click any duty to select or deselect it for this school year's evaluation:
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
              {availableJDResponsibilities.map((duty, idx) => {
                const isSelected = selectedResponsibilities.some((r) => r.title === duty);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleSelectDuty(duty)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition flex items-start gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="mt-0.5 rounded text-blue-900 pointer-events-none"
                    />
                    <span>{duty}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Responsibilities Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-4">Responsibility Description</th>
                <th className="py-3 px-3 w-28 text-center">Weight (Max 20)</th>
                <th className="py-3 px-3 w-24 text-center">Self Score</th>
                <th className="py-3 px-3 w-28 text-center">Supervisor Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedResponsibilities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No responsibilities selected yet. Please select 4 to 8 duties from the list above.
                  </td>
                </tr>
              ) : (
                selectedResponsibilities.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 text-slate-800 text-xs font-medium">
                      {item.title}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isPhase1Editable ? (
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={item.weight}
                          onChange={(e) => handleWeightChange(item.title, parseInt(e.target.value) || 0)}
                          className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="font-bold text-slate-800">{item.weight}</span>
                      )}
                    </td>
                    {/* Self Score */}
                    <td className="py-3 px-3 text-center">
                      {isPhase3Editable && (isStaff || isAdmin) ? (
                        <input
                          type="number"
                          min={0}
                          max={item.weight}
                          value={item.scoreSelf ?? ''}
                          placeholder={`0-${item.weight}`}
                          onChange={(e) =>
                            handleScoreChange(
                              item.id!,
                              'RESPONSIBILITY',
                              'scoreSelf',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold"
                        />
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {item.scoreSelf ?? '--'}
                        </span>
                      )}
                    </td>
                    {/* Supervisor Score */}
                    <td className="py-3 px-3 text-center">
                      {isPhase3Editable && (isSupervisor || isAdmin) ? (
                        <input
                          type="number"
                          min={0}
                          max={item.weight}
                          value={item.scoreSupervisor ?? ''}
                          placeholder={`0-${item.weight}`}
                          onChange={(e) =>
                            handleScoreChange(
                              item.id!,
                              'RESPONSIBILITY',
                              'scoreSupervisor',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold"
                        />
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {item.scoreSupervisor ?? '--'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-300">
                <td colSpan={2} className="py-3 px-4 text-right">
                  Total Part A:
                </td>
                <td className="py-3 px-3 text-center font-mono text-sm">
                  <span className={isWeightValid ? 'text-emerald-700' : 'text-rose-600'}>
                    {totalWeightA} / 80
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-mono text-sm text-slate-800">
                  {totalPartASelf}
                </td>
                <td className="py-3 px-3 text-center font-mono text-sm text-blue-900">
                  {totalPartASupervisor}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* SECTION B: Skills */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
                B
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Core Skills Evaluation (20 Points Total)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Score each item out of 5 based on the official SCIS rubrics below.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded">
            Total Part B: 20 pts
          </div>
        </div>

        {/* Skills Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Skill Category</th>
                <th className="py-3 px-3 w-24 text-center">Score (Max 5)</th>
                <th className="py-3 px-3 w-24 text-center">Self Score</th>
                <th className="py-3 px-3 w-28 text-center">Supervisor Score</th>
                <th className="py-3 px-3 w-28 text-center">Rubrics Guide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {skillItems.map((skill: any, index: number) => {
                const rubric = SKILL_RUBRICS.find((r) => r.name.toLowerCase().includes(skill.title.toLowerCase()));
                const isExpanded = expandedRubric === skill.title;

                return (
                  <tr key={skill.id || index} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900 text-sm">
                      {skill.title}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-600">
                      5
                    </td>
                    {/* Self Score */}
                    <td className="py-3 px-3 text-center">
                      {isPhase3Editable && (isStaff || isAdmin) ? (
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={skill.scoreSelf ?? ''}
                          placeholder="1-5"
                          onChange={(e) =>
                            handleScoreChange(
                              skill.id,
                              'SKILL',
                              'scoreSelf',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold"
                        />
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {skill.scoreSelf ?? '--'}
                        </span>
                      )}
                    </td>
                    {/* Supervisor Score */}
                    <td className="py-3 px-3 text-center">
                      {isPhase3Editable && (isSupervisor || isAdmin) ? (
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={skill.scoreSupervisor ?? ''}
                          placeholder="1-5"
                          onChange={(e) =>
                            handleScoreChange(
                              skill.id,
                              'SKILL',
                              'scoreSupervisor',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold"
                        />
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {skill.scoreSupervisor ?? '--'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setExpandedRubric(isExpanded ? null : skill.title)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 hover:text-blue-700"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Hide' : 'Rubrics'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-300">
                <td className="py-3 px-4 text-right">Total Part B:</td>
                <td className="py-3 px-3 text-center font-mono text-sm">20</td>
                <td className="py-3 px-3 text-center font-mono text-sm">{totalPartBSelf}</td>
                <td className="py-3 px-3 text-center font-mono text-sm text-blue-900">
                  {totalPartBSupervisor}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rubrics Criteria Reference Table */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Official SCIS Skills Rubrics Reference</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SKILL_RUBRICS.map((rubric) => (
              <div key={rubric.key} className="bg-white p-3 rounded border border-slate-200 text-xs">
                <div className="font-bold text-blue-950 mb-1">{rubric.name}</div>
                <div className="space-y-1 text-slate-600">
                  <div><strong>5 (Excellent):</strong> {rubric.rubrics[5]}</div>
                  <div><strong>4 (Very Good):</strong> {rubric.rubrics[4]}</div>
                  <div><strong>3 (Good):</strong> {rubric.rubrics[3]}</div>
                  <div><strong>2 (Fair):</strong> {rubric.rubrics[2]}</div>
                  <div><strong>1 (Poor):</strong> {rubric.rubrics[1]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOTAL SCORE & ASSESSMENT GRADE BANNER */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">
              Overall Evaluation Result
            </div>
            <div className="text-xl font-bold mt-0.5">
              Total Score (Part A + Part B):{' '}
              <span className="font-mono text-2xl text-amber-300">
                {liveTotalScoreSupervisor} / 100
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-1">
              (Employee Self Total: {liveTotalScoreSelf} / 100)
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] uppercase font-bold text-slate-300">Assessment Grade</div>
              <div className="text-base font-bold text-white">
                Grade {currentGrade.grade}: {currentGrade.label}
              </div>
            </div>
            <span
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow ${currentGrade.badgeClass}`}
            >
              {currentGrade.grade}
            </span>
          </div>
        </div>
      </section>

      {/* SECTION C: Development */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
              C
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Development (To be completed by Employee and Supervisor)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Comments by Employee
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Desired developmental requests:
              </label>
              <textarea
                rows={3}
                disabled={!isPhase1Editable && !isPhase2Editable && !isAdmin}
                value={devRequestEmployee}
                onChange={(e) => setDevRequestEmployee(e.target.value)}
                placeholder="Specific training, workshops, or skills you would like to develop..."
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Other comments:
              </label>
              <textarea
                rows={3}
                disabled={!isPhase1Editable && !isPhase2Editable && !isAdmin}
                value={otherCommentsEmployee}
                onChange={(e) => setOtherCommentsEmployee(e.target.value)}
                placeholder="Additional comments regarding support or resources needed..."
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Comments by Supervisor
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Desired developmental requests:
              </label>
              <textarea
                rows={3}
                disabled={!isPhase1Editable && !isPhase2Editable && !isAdmin}
                value={devRequestSupervisor}
                onChange={(e) => setDevRequestSupervisor(e.target.value)}
                placeholder="Recommended courses, coaching, or institutional opportunities..."
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Other comments:
              </label>
              <textarea
                rows={3}
                disabled={!isPhase1Editable && !isPhase2Editable && !isAdmin}
                value={otherCommentsSupervisor}
                onChange={(e) => setOtherCommentsSupervisor(e.target.value)}
                placeholder="Additional notes from supervisor..."
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION D: Goals */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
              D
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Goals (Identify manageable goals that aid successful delivery of responsibilities)
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {goals.map((g, idx) => (
            <div key={g.goalIndex} className="flex items-start gap-3">
              <span className="font-bold text-sm text-slate-600 mt-2 w-5">
                {g.goalIndex}.
              </span>
              <textarea
                rows={2}
                disabled={!isPhase1Editable && !isAdmin}
                value={g.description}
                onChange={(e) => {
                  const updated = [...goals];
                  updated[idx].description = e.target.value;
                  setGoals(updated);
                }}
                placeholder={`Goal ${g.goalIndex} description...`}
                className="flex-1 text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
          ))}
        </div>
      </section>

      {/* SECTION E: Mid Year Review Comments */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
              E
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Mid-Year Review Comments (Phase 2)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Comments entered by Employee:
            </label>
            <textarea
              rows={4}
              disabled={!isPhase2Editable && !isAdmin}
              value={midYearEmployee}
              onChange={(e) => setMidYearEmployee(e.target.value)}
              placeholder="Reflections on goal progress achieved since start of year..."
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Comments entered by Supervisor:
            </label>
            <textarea
              rows={4}
              disabled={!isPhase2Editable && !isAdmin}
              value={midYearSupervisor}
              onChange={(e) => setMidYearSupervisor(e.target.value)}
              placeholder="Constructive mid-year feedback and adjustments for second semester..."
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>
        </div>
      </section>

      {/* SECTION F: End of Year Review Comments */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
              F
            </span>
            <h2 className="text-base font-bold text-slate-900">
              End of Year Review Comments (Phase 3)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Comments entered by Employee:
            </label>
            <textarea
              rows={4}
              disabled={!isPhase3Editable && !isAdmin}
              value={finalCommentsEmployee}
              onChange={(e) => setFinalCommentsEmployee(e.target.value)}
              placeholder="Summary of annual achievements, highlights, and growth..."
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Comments entered by Supervisor:
            </label>
            <textarea
              rows={4}
              disabled={!isPhase3Editable && !isAdmin}
              value={finalCommentsSupervisor}
              onChange={(e) => setFinalCommentsSupervisor(e.target.value)}
              placeholder="Comprehensive summary of employee performance and leadership observations..."
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 py-3 px-4 shadow-lg z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Phase Actions:</span>
            {currentPhaseInfo.phase === 1 && (
              <span className="text-xs text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Phase 1 Active ({totalWeightA}/80 pts)
              </span>
            )}
            {currentPhaseInfo.phase === 2 && (
              <span className="text-xs text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Phase 2 Active (Mid-Year)
              </span>
            )}
            {currentPhaseInfo.phase === 3 && (
              <span className="text-xs text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Phase 3 Active ({liveTotalScoreSupervisor}/100 pts)
              </span>
            )}
            {!currentPhaseInfo.isOpen && (
              <span className="text-xs text-slate-500 italic">Review window closed (Read-Only)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Phase 1 Save / Submit */}
            {isPhase1Editable && (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePhase1(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving || !isWeightValid || !isCountValid}
                  onClick={() => handleSavePhase1(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 inline mr-1" />
                  <span>Submit Phase 1</span>
                </button>
              </>
            )}

            {/* Phase 2 Save / Submit */}
            {isPhase2Editable && (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePhase2(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePhase2(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 inline mr-1" />
                  <span>Submit Phase 2</span>
                </button>
              </>
            )}

            {/* Phase 3 Save / Submit */}
            {isPhase3Editable && (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePhase3()}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  <span>Save Scores</span>
                </button>
                {isStaff && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSavePhase3('self')}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg shadow transition disabled:opacity-50"
                  >
                    <span>Submit Self Evaluation</span>
                  </button>
                )}
                {isSupervisor && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSavePhase3('supervisor')}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50"
                  >
                    <span>Complete Final Evaluation</span>
                  </button>
                )}
              </>
            )}

            <Link
              href={`/api/evaluations/${evaluation.id}/pdf`}
              target="_blank"
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 inline mr-1" />
              <span>Download PDF</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
