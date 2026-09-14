'use client';

import React, { useState } from 'react';
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
  Lock,
  Unlock,
} from 'lucide-react';
import { SKILL_RUBRICS, calculateGrade } from '@/lib/scoring';
import {
  savePhase1Action,
  savePhase2Action,
  savePhase3Action,
  toggleFormLockAction,
  toggleItemLockAction,
} from '@/app/evaluations/[id]/actions';
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Form lock state (supervisor/dept head/admin can lock the form for the employee)
  const [isFormLocked, setIsFormLocked] = useState<boolean>(Boolean(evaluation.isFormLocked));
  const [lockedByName, setLockedByName] = useState<string | null>(evaluation.lockedByName || null);
  const [lockedAt, setLockedAt] = useState<string | null>(evaluation.lockedAt ? new Date(evaluation.lockedAt).toISOString() : null);

  // Role permissions
  const isStaff = evaluation.staffProfile.email.toLowerCase() === currentUser.email.toLowerCase();
  const isSupervisor = evaluation.supervisor?.email.toLowerCase() === currentUser.email.toLowerCase();
  const isDeptHead = evaluation.deptHead?.email.toLowerCase() === currentUser.email.toLowerCase();
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HR_ADMIN';

  const canEmployeeEdit = (isStaff || isAdmin) && (!isFormLocked || isSupervisor || isDeptHead || isAdmin);
  const canSupervisorEdit = isSupervisor || isDeptHead || isAdmin;

  // Strict Phase Active Checks
  const isPhase1Active = (currentPhaseInfo.isOpen && currentPhaseInfo.phase === 1) || (isAdmin && currentPhaseInfo.phase === 1);
  const isPhase2Active = (currentPhaseInfo.isOpen && currentPhaseInfo.phase === 2) || (isAdmin && currentPhaseInfo.phase === 2);
  const isPhase3Active = (currentPhaseInfo.isOpen && currentPhaseInfo.phase === 3) || (isAdmin && currentPhaseInfo.phase === 3);

  // Workflow status
  const isSelfEvaluationSubmitted = evaluation.status === 'PHASE3_SELF_COMPLETED' || evaluation.status === 'COMPLETED';
  const isFinalCompleted = evaluation.status === 'COMPLETED';

  // Phase 1 permissions: Both employee and supervisor can select duties & adjust weights; supervisor can lock duties
  const isPhase1Editable = (canEmployeeEdit || canSupervisorEdit) && isPhase1Active;
  const isGoalsEditable = (canEmployeeEdit || canSupervisorEdit) && isPhase1Active;

  // Phase 2 permissions: Mid-Year Review
  const isPhase2EmployeeEditable = canEmployeeEdit && isPhase2Active;
  const isPhase2SupervisorEditable = canSupervisorEdit && isPhase2Active;

  // Phase 3 permissions: Scoring & Final Review
  const isPhase3SelfEditable = canEmployeeEdit && isPhase3Active && !isSelfEvaluationSubmitted;
  const isPhase3SupervisorEditable = canSupervisorEdit && isPhase3Active && (isSelfEvaluationSubmitted || isAdmin) && !isFinalCompleted;

  // Section C permissions: Development
  const isDevEmployeeEditable = canEmployeeEdit && (isPhase1Active || isPhase2Active || isPhase3Active);
  const isDevSupervisorEditable = canSupervisorEdit && (isPhase1Active || isPhase2Active || isPhase3Active);

  // Phase 1 State: Responsibilities & Weights
  const initialResponsibilities = evaluation.items
    .filter((i: any) => i.itemType === 'RESPONSIBILITY')
    .map((i: any) => ({
      id: i.id,
      title: i.title,
      weight: i.weight || 10,
      scoreSelf: i.scoreSelf,
      scoreSupervisor: i.scoreSupervisor,
      isLocked: Boolean(i.isLocked),
    }));

  const [selectedResponsibilities, setSelectedResponsibilities] = useState<{
    id?: string;
    title: string;
    weight: number;
    scoreSelf?: number | null;
    scoreSupervisor?: number | null;
    isLocked?: boolean;
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

  // Grade is only valid when supervisor has actually evaluated:
  const hasSupervisorScores =
    selectedResponsibilities.some((r) => r.scoreSupervisor !== null && r.scoreSupervisor !== undefined) ||
    skillItems.some((s: any) => s.scoreSupervisor !== null && s.scoreSupervisor !== undefined);
  const isSupervisorEvaluationDone =
    (evaluation.status === 'COMPLETED' || (isSupervisor || isAdmin)) &&
    hasSupervisorScores &&
    liveTotalScoreSupervisor > 0;

  const currentGrade = isSupervisorEvaluationDone ? calculateGrade(liveTotalScoreSupervisor) : null;

  // Handlers for Phase 1
  const toggleSelectDuty = (dutyText: string) => {
    if (!isPhase1Editable) return;
    const existing = selectedResponsibilities.find((r) => r.title === dutyText);
    if (existing) {
      if (existing.isLocked && !canSupervisorEdit) {
        alert('This responsibility has been locked as mandatory by your supervisor and cannot be removed.');
        return;
      }
      setSelectedResponsibilities(selectedResponsibilities.filter((r) => r.title !== dutyText));
    } else {
      if (selectedResponsibilities.length >= 8) {
        alert('Maximum of 8 responsibilities allowed.');
        return;
      }
      setSelectedResponsibilities([
        ...selectedResponsibilities,
        { title: dutyText, weight: 10, scoreSelf: null, scoreSupervisor: null, isLocked: false },
      ]);
    }
  };

  const toggleLockDuty = async (dutyTitle: string) => {
    if (!canSupervisorEdit || !isPhase1Active) return;
    try {
      setSelectedResponsibilities((prev) =>
        prev.map((item) =>
          item.title === dutyTitle ? { ...item, isLocked: !item.isLocked } : item
        )
      );
      await toggleItemLockAction(evaluation.id, dutyTitle);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating responsibility lock status');
    }
  };

  const handleToggleFormLock = async () => {
    if (!canSupervisorEdit) return;
    try {
      setIsSaving(true);
      setErrorMessage(null);
      const res = await toggleFormLockAction(evaluation.id);
      setIsFormLocked(res.isFormLocked);
      if (res.isFormLocked) {
        const callerName = currentUser.fullName || currentUser.email;
        setLockedByName(callerName);
        setLockedAt(new Date().toISOString());
        showToast('Evaluation form has been locked for the employee.');
      } else {
        setLockedByName(null);
        setLockedAt(null);
        showToast('Evaluation form has been unlocked.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating form lock status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWeightChange = (title: string, weight: number) => {
    if (!isPhase1Editable) return;
    const item = selectedResponsibilities.find((r) => r.title === title);
    if (item?.isLocked && !canSupervisorEdit) {
      alert('This responsibility has been locked as mandatory by your supervisor. Its weight cannot be changed.');
      return;
    }
    setSelectedResponsibilities((prev) =>
      prev.map((item) => (item.title === title ? { ...item, weight: Math.max(1, Math.min(20, weight)) } : item))
    );
  };

  const handleScoreChange = (
    itemIndex: number,
    type: 'RESPONSIBILITY' | 'SKILL',
    field: 'scoreSelf' | 'scoreSupervisor',
    value: number | string
  ) => {
    const numVal = typeof value === 'string' ? (value === '' ? null : parseInt(value, 10)) : value;

    if (type === 'RESPONSIBILITY') {
      setSelectedResponsibilities((prev) =>
        prev.map((item, idx) => {
          if (idx === itemIndex) {
            const clamped = numVal === null || isNaN(numVal) ? null : Math.max(0, Math.min(item.weight, numVal));
            return { ...item, [field]: clamped };
          }
          return item;
        })
      );
    } else {
      setSkillItems((prev: any[]) =>
        prev.map((item: any, idx: number) => {
          if (idx === itemIndex) {
            const clamped = numVal === null || isNaN(numVal) ? null : Math.max(0, Math.min(5, numVal));
            return { ...item, [field]: clamped };
          }
          return item;
        })
      );
    }
  };

  // Submission actions
  const handleSavePhase1 = async (isSubmitting = false) => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      await savePhase1Action(evaluation.id, {
        responsibilities: selectedResponsibilities.map((r) => ({
          title: r.title,
          weight: Number(r.weight),
          isLocked: Boolean(r.isLocked),
        })),
        goals: goals.filter((g) => g.description.trim() !== ''),
        devRequestEmployee,
        devRequestSupervisor,
        otherCommentsEmployee,
        otherCommentsSupervisor,
        isSubmitting,
      });

      showToast(
        isSubmitting
          ? 'Phase 1 goals and responsibilities successfully submitted!'
          : 'Draft saved successfully.'
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

      await savePhase2Action(evaluation.id, {
        midYearCommentsEmployee: midYearEmployee,
        midYearCommentsSupervisor: midYearSupervisor,
        isSubmitting,
      });

      showToast(
        isSubmitting
          ? 'Phase 2 mid-year review comments submitted!'
          : 'Draft saved successfully.'
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

      const allScores = [
        ...selectedResponsibilities.map((r) => ({
          id: r.id,
          title: r.title,
          scoreSelf: r.scoreSelf !== null && r.scoreSelf !== undefined ? Number(r.scoreSelf) : null,
          scoreSupervisor:
            r.scoreSupervisor !== null && r.scoreSupervisor !== undefined ? Number(r.scoreSupervisor) : null,
        })),
        ...skillItems.map((s: any) => ({
          id: s.id,
          title: s.title,
          scoreSelf: s.scoreSelf !== null && s.scoreSelf !== undefined ? Number(s.scoreSelf) : null,
          scoreSupervisor:
            s.scoreSupervisor !== null && s.scoreSupervisor !== undefined ? Number(s.scoreSupervisor) : null,
        })),
      ];

      await savePhase3Action(evaluation.id, {
        itemScores: allScores,
        finalCommentsEmployee,
        finalCommentsSupervisor,
        devRequestEmployee,
        devRequestSupervisor,
        otherCommentsEmployee,
        otherCommentsSupervisor,
        isSelfSubmission: submissionType === 'self',
        isFinalSupervisorSubmission: submissionType === 'supervisor',
      });

      showToast(
        submissionType === 'supervisor'
          ? 'Final evaluation completed and submitted!'
          : submissionType === 'self'
          ? 'Self-evaluation scores submitted successfully!'
          : 'Scores saved successfully.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving Phase 3');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Fixed bottom-right toast — always visible regardless of scroll position */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-semibold transition-all animate-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          }
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-60 hover:opacity-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Inline error banner (stays in-page for errors so users can read and act) */}
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

      {/* Form Locked Warning Banner */}
      {isFormLocked && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-800">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>Form Locked by {lockedByName || 'Supervisor'}</span>
                {lockedAt && (
                  <span className="text-xs font-normal text-amber-800">
                    ({new Date(lockedAt).toLocaleString('en-US', {
                      timeZone: 'Asia/Shanghai',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })} CST)
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {canSupervisorEdit
                  ? 'This form is locked for the employee. As a supervisor or administrator, you retain editing capabilities and can unlock it anytime.'
                  : 'This evaluation form has been locked by your supervisor. All editing and submissions are currently disabled.'}
              </p>
            </div>
          </div>
          {canSupervisorEdit && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleToggleFormLock}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-lg transition self-start sm:self-auto flex-shrink-0 disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Form for Employee</span>
            </button>
          )}
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
            {canSupervisorEdit && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleToggleFormLock}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg shadow-sm transition ${
                  isFormLocked
                    ? 'bg-amber-300 hover:bg-amber-200 text-amber-950 font-bold'
                    : 'bg-blue-800/90 hover:bg-blue-800 text-white'
                }`}
                title={
                  isFormLocked
                    ? 'Unlock form to allow employee editing'
                    : 'Lock form to prevent employee editing'
                }
              >
                {isFormLocked ? (
                  <>
                    <Unlock className="w-4 h-4 text-amber-950" />
                    <span>Unlock Form for Employee</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Lock Form for Employee</span>
                  </>
                )}
              </button>
            )}

            <a
              href={`/api/evaluations/${evaluation.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition"
            >
              <Download className="w-4 h-4 text-blue-900" />
              <span>Download PDF version</span>
            </a>

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
                const selectedItem = selectedResponsibilities.find((r) => r.title === duty);
                const isSelected = Boolean(selectedItem);
                const isLocked = Boolean(selectedItem?.isLocked);
                const isRemoveDisabled = isLocked && !canSupervisorEdit;
                const isAddDisabled = !isSelected && selectedResponsibilities.length >= 8;
                const isButtonDisabled = isRemoveDisabled || isAddDisabled || (isFormLocked && !canSupervisorEdit);

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isButtonDisabled}
                    onClick={() => toggleSelectDuty(duty)}
                    title={
                      isRemoveDisabled
                        ? 'Mandatory duty locked by your supervisor (cannot be removed)'
                        : isFormLocked && !canSupervisorEdit
                        ? 'Form locked by your supervisor: duty selection is disabled'
                        : isAddDisabled
                        ? 'Maximum of 8 responsibilities reached'
                        : isSelected
                        ? 'Click to deselect duty'
                        : 'Click to select duty'
                    }
                    className={`text-left p-2.5 rounded-lg border text-xs transition flex items-center justify-between gap-2.5 ${
                      isButtonDisabled
                        ? 'cursor-not-allowed opacity-85 ' +
                          (isLocked
                            ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-medium'
                            : isSelected
                            ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                            : 'bg-slate-100 text-slate-400 border-slate-200')
                        : isSelected
                        ? isLocked
                          ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-medium cursor-pointer'
                          : 'bg-blue-50 border-blue-300 text-blue-950 font-medium cursor-pointer'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mt-0.5 rounded text-blue-900 pointer-events-none"
                      />
                      <span>{duty}</span>
                    </div>
                    {isLocked && (
                      <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        <Lock className="w-3 h-3" /> Mandatory
                      </span>
                    )}
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
                selectedResponsibilities.map((item, index) => {
                  const isWeightDisabled = !isPhase1Editable || (item.isLocked && !canSupervisorEdit);
                  const weightDisabledReason = isFormLocked && !canSupervisorEdit
                    ? 'Evaluation form locked by your supervisor: weights cannot be modified.'
                    : !isPhase1Active
                    ? 'Weights can only be established and edited during Phase 1 (Start of Year).'
                    : item.isLocked && !canSupervisorEdit
                    ? 'Mandatory duty locked by your supervisor (weight cannot be modified).'
                    : !isPhase1Editable
                    ? 'You do not have permission to edit responsibilities.'
                    : null;

                  const selfScoreDisabledReason = isFormLocked && !canSupervisorEdit
                    ? 'Evaluation form locked by your supervisor: scoring is disabled.'
                    : !isPhase3Active
                    ? 'Self-evaluation scores open during Phase 3 (End of Year).'
                    : !canEmployeeEdit
                    ? 'Self-evaluation scores can only be entered by the employee.'
                    : isSelfEvaluationSubmitted
                    ? 'Self-evaluation scores have been submitted and locked.'
                    : null;

                  const supervisorScoreDisabledReason = !isPhase3Active
                    ? 'Supervisor scores open during Phase 3 (End of Year).'
                    : !canSupervisorEdit
                    ? 'Supervisor scores can only be entered by your supervisor or department leader.'
                    : !isSelfEvaluationSubmitted && !isAdmin
                    ? 'Awaiting employee self-evaluation submission before supervisor scoring opens.'
                    : isFinalCompleted
                    ? 'Annual evaluation cycle is completed and officially locked.'
                    : null;

                  return (
                    <tr key={index} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 text-slate-800 text-xs font-medium">
                        <div className="flex items-start justify-between gap-3">
                          <span className="leading-relaxed">{item.title}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {canSupervisorEdit && isPhase1Active && (
                              <button
                                type="button"
                                onClick={() => toggleLockDuty(item.title)}
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition ${
                                  item.isLocked
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-sm'
                                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                }`}
                                title={
                                  item.isLocked
                                    ? 'Click to unlock this duty for the employee'
                                    : 'Click to lock this duty and its weight as mandatory for the employee'
                                }
                              >
                                {item.isLocked ? (
                                  <>
                                    <Lock className="w-3 h-3 text-amber-700" />
                                    <span>Mandatory (Locked)</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3 h-3 text-slate-400" />
                                    <span>Lock as Mandatory</span>
                                  </>
                                )}
                              </button>
                            )}
                            {!canSupervisorEdit && item.isLocked && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                                title="Locked by supervisor as mandatory (cannot be removed or weight changed)"
                              >
                                <Lock className="w-3 h-3 text-amber-600" />
                                <span>Mandatory</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {!isWeightDisabled ? (
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={item.weight}
                            onChange={(e) => handleWeightChange(item.title, parseInt(e.target.value) || 0)}
                            className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <div
                            className="inline-block cursor-not-allowed"
                            title={weightDisabledReason || undefined}
                          >
                            <span className="font-bold text-slate-800 px-2 py-1 bg-slate-100 rounded border border-slate-200 text-xs">
                              {item.weight}
                            </span>
                          </div>
                        )}
                      </td>
                      {/* Self Score */}
                      <td className="py-3 px-3 text-center">
                        {isPhase3SelfEditable ? (
                          <input
                            type="number"
                            min={0}
                            max={item.weight}
                            value={item.scoreSelf ?? ''}
                            placeholder={`0-${item.weight}`}
                            onChange={(e) =>
                              handleScoreChange(
                                index,
                                'RESPONSIBILITY',
                                'scoreSelf',
                                e.target.value
                              )
                            }
                            className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <div
                            className="inline-block cursor-not-allowed"
                            title={selfScoreDisabledReason || undefined}
                          >
                            <span className="font-semibold text-slate-500 px-2 py-1 bg-slate-100 rounded text-xs">
                              {item.scoreSelf !== null && item.scoreSelf !== undefined ? item.scoreSelf : '--'}
                            </span>
                          </div>
                        )}
                      </td>
                      {/* Supervisor Score */}
                      <td className="py-3 px-3 text-center">
                        {isPhase3SupervisorEditable ? (
                          <input
                            type="number"
                            min={0}
                            max={item.weight}
                            value={item.scoreSupervisor ?? ''}
                            placeholder={`0-${item.weight}`}
                            onChange={(e) =>
                              handleScoreChange(
                                index,
                                'RESPONSIBILITY',
                                'scoreSupervisor',
                                e.target.value
                              )
                            }
                            className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <div
                            className="inline-block cursor-not-allowed"
                            title={supervisorScoreDisabledReason || undefined}
                          >
                            <span className="font-semibold text-slate-500 px-2 py-1 bg-slate-100 rounded text-xs">
                              {item.scoreSupervisor !== null && item.scoreSupervisor !== undefined ? item.scoreSupervisor : '--'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {skillItems.map((skill: any, index: number) => {
                const selfScoreDisabledReason = isFormLocked && !canSupervisorEdit
                  ? 'Evaluation form locked by your supervisor: scoring is disabled.'
                  : !isPhase3Active
                  ? 'Self-evaluation scores open during Phase 3 (End of Year).'
                  : !canEmployeeEdit
                  ? 'Self-evaluation scores can only be entered by the employee.'
                  : isSelfEvaluationSubmitted
                  ? 'Self-evaluation scores have been submitted and locked.'
                  : null;

                const supervisorScoreDisabledReason = !isPhase3Active
                  ? 'Supervisor scores open during Phase 3 (End of Year).'
                  : !canSupervisorEdit
                  ? 'Supervisor scores can only be entered by your supervisor or department leader.'
                  : !isSelfEvaluationSubmitted && !isAdmin
                  ? 'Awaiting employee self-evaluation submission before supervisor scoring opens.'
                  : isFinalCompleted
                  ? 'Annual evaluation cycle is completed and officially locked.'
                  : null;

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
                      {isPhase3SelfEditable ? (
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={skill.scoreSelf ?? ''}
                          placeholder="1-5"
                          onChange={(e) =>
                            handleScoreChange(
                              index,
                              'SKILL',
                              'scoreSelf',
                              e.target.value
                            )
                          }
                          className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <div
                          className="inline-block cursor-not-allowed"
                          title={selfScoreDisabledReason || undefined}
                        >
                          <span className="font-semibold text-slate-500 px-2 py-1 bg-slate-100 rounded text-xs">
                            {skill.scoreSelf ?? '--'}
                          </span>
                        </div>
                      )}
                    </td>
                    {/* Supervisor Score */}
                    <td className="py-3 px-3 text-center">
                      {isPhase3SupervisorEditable ? (
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={skill.scoreSupervisor ?? ''}
                          placeholder="1-5"
                          onChange={(e) =>
                            handleScoreChange(
                              index,
                              'SKILL',
                              'scoreSupervisor',
                              e.target.value
                            )
                          }
                          className="w-16 text-center border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <div
                          className="inline-block cursor-not-allowed"
                          title={supervisorScoreDisabledReason || undefined}
                        >
                          <span className="font-semibold text-slate-500 px-2 py-1 bg-slate-100 rounded text-xs">
                            {skill.scoreSupervisor ?? '--'}
                          </span>
                        </div>
                      )}
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
                {currentGrade ? `${liveTotalScoreSupervisor} / 100` : '-- / 100'}
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-1">
              (Employee Self Total: {liveTotalScoreSelf > 0 ? `${liveTotalScoreSelf} / 100` : '--'})
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] uppercase font-bold text-slate-300">Assessment Grade</div>
              <div className="text-base font-bold text-white">
                {currentGrade ? `Grade ${currentGrade.grade}: ${currentGrade.label}` : 'Pending Supervisor Scoring'}
              </div>
            </div>
            <span
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow ${
                currentGrade ? currentGrade.badgeClass : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}
            >
              {currentGrade ? currentGrade.grade : '--'}
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
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Comments by Employee
              </div>
              {!isDevEmployeeEditable && (
                <span
                  className="text-[11px] text-slate-500 font-normal italic cursor-help"
                  title={
                    isFormLocked && !canSupervisorEdit
                      ? 'Form locked by your supervisor'
                      : 'Editable only by the employee'
                  }
                >
                  {isFormLocked && !canSupervisorEdit ? '(Form Locked)' : '(Editable by Employee)'}
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Desired developmental requests:
              </label>
              <textarea
                rows={3}
                disabled={!isDevEmployeeEditable}
                value={devRequestEmployee}
                onChange={(e) => setDevRequestEmployee(e.target.value)}
                placeholder="Specific training, workshops, or skills you would like to develop..."
                title={
                  !isDevEmployeeEditable
                    ? isFormLocked && !canSupervisorEdit
                      ? 'Evaluation form locked by your supervisor: developmental requests cannot be edited.'
                      : 'Developmental requests can only be entered by the employee.'
                    : undefined
                }
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Other comments:
              </label>
              <textarea
                rows={3}
                disabled={!isDevEmployeeEditable}
                value={otherCommentsEmployee}
                onChange={(e) => setOtherCommentsEmployee(e.target.value)}
                placeholder="Additional comments regarding support or resources needed..."
                title={
                  !isDevEmployeeEditable
                    ? isFormLocked && !canSupervisorEdit
                      ? 'Evaluation form locked by your supervisor: comments cannot be edited.'
                      : 'Comments can only be entered by the employee.'
                    : undefined
                }
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Comments by Supervisor
              </div>
              {!isDevSupervisorEditable && (
                <span
                  className="text-[11px] text-slate-500 font-normal italic cursor-help"
                  title="Supervisor comments can only be entered by your supervisor or department leader"
                >
                  (Editable by Supervisor)
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Desired developmental requests:
              </label>
              <textarea
                rows={3}
                disabled={!isDevSupervisorEditable}
                value={devRequestSupervisor}
                onChange={(e) => setDevRequestSupervisor(e.target.value)}
                placeholder="Recommended courses, coaching, or institutional opportunities..."
                title={
                  !isDevSupervisorEditable
                    ? 'Supervisor developmental comments can only be entered by your supervisor or department leader.'
                    : undefined
                }
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Other comments:
              </label>
              <textarea
                rows={3}
                disabled={!isDevSupervisorEditable}
                value={otherCommentsSupervisor}
                onChange={(e) => setOtherCommentsSupervisor(e.target.value)}
                placeholder="Additional notes from supervisor..."
                title={
                  !isDevSupervisorEditable
                    ? 'Supervisor comments can only be entered by your supervisor or department leader.'
                    : undefined
                }
                className="w-full text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION D: Goals */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
              D
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Goals (Identify manageable goals that aid successful delivery of responsibilities)
            </h2>
          </div>
          {!isGoalsEditable && (
            <span
              className="text-[11px] text-slate-500 italic cursor-help"
              title={
                isFormLocked && !canSupervisorEdit
                  ? 'Form locked by your supervisor'
                  : 'Goals are established during Phase 1 (Start of Year)'
              }
            >
              {isFormLocked && !canSupervisorEdit ? '(Form Locked)' : '(Editable during Phase 1)'}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {goals.map((g, idx) => (
            <div key={g.goalIndex} className="flex items-start gap-3">
              <span className="font-bold text-sm text-slate-600 mt-2 w-5">
                {g.goalIndex}.
              </span>
              <textarea
                rows={2}
                disabled={!isGoalsEditable}
                value={g.description}
                onChange={(e) => {
                  const updated = [...goals];
                  updated[idx].description = e.target.value;
                  setGoals(updated);
                }}
                placeholder={`Goal ${g.goalIndex} description...`}
                title={
                  !isGoalsEditable
                    ? isFormLocked && !canSupervisorEdit
                      ? 'Form locked by your supervisor: goals cannot be modified.'
                      : !isPhase1Active
                      ? 'Goals are established during Phase 1 (Start of Year) and are locked for subsequent phases.'
                      : 'You do not have permission to edit goals.'
                    : undefined
                }
                className="flex-1 text-xs border border-slate-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Comments entered by Employee:
              </label>
              {!isPhase2EmployeeEditable && (
                <span
                  className="text-[11px] text-slate-500 italic cursor-help"
                  title={
                    isFormLocked && !canSupervisorEdit
                      ? 'Form locked by your supervisor'
                      : !isPhase2Active
                      ? 'Mid-year review opens during Phase 2'
                      : 'Editable only by the employee'
                  }
                >
                  {isFormLocked && !canSupervisorEdit
                    ? '(Form Locked)'
                    : !isPhase2Active
                    ? '(Opens in Phase 2)'
                    : '(Editable by Employee)'}
                </span>
              )}
            </div>
            <textarea
              rows={4}
              disabled={!isPhase2EmployeeEditable}
              value={midYearEmployee}
              onChange={(e) => setMidYearEmployee(e.target.value)}
              placeholder="Reflections on goal progress achieved since start of year..."
              title={
                !isPhase2EmployeeEditable
                  ? isFormLocked && !canSupervisorEdit
                    ? 'Form locked by your supervisor: mid-year reflection cannot be edited.'
                    : !isPhase2Active
                    ? 'Mid-year review comments open during Phase 2 (Mid-Year).'
                    : !canEmployeeEdit
                    ? 'Mid-year reflection can only be entered by the employee.'
                    : undefined
                  : undefined
              }
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Comments entered by Supervisor:
              </label>
              {!isPhase2SupervisorEditable && (
                <span
                  className="text-[11px] text-slate-500 italic cursor-help"
                  title={
                    !isPhase2Active
                      ? 'Mid-year review opens during Phase 2'
                      : 'Supervisor feedback can only be entered by your supervisor or department leader'
                  }
                >
                  {!isPhase2Active ? '(Opens in Phase 2)' : '(Editable by Supervisor)'}
                </span>
              )}
            </div>
            <textarea
              rows={4}
              disabled={!isPhase2SupervisorEditable}
              value={midYearSupervisor}
              onChange={(e) => setMidYearSupervisor(e.target.value)}
              placeholder="Constructive mid-year feedback and adjustments for second semester..."
              title={
                !isPhase2SupervisorEditable
                  ? !isPhase2Active
                    ? 'Mid-year review comments open during Phase 2 (Mid-Year).'
                    : !canSupervisorEdit
                    ? 'Mid-year feedback can only be entered by your supervisor or department leader.'
                    : undefined
                  : undefined
              }
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Comments entered by Employee:
              </label>
              {!isPhase3SelfEditable && (
                <span
                  className="text-[11px] text-slate-500 italic cursor-help"
                  title={
                    isFormLocked && !canSupervisorEdit
                      ? 'Form locked by your supervisor'
                      : !isPhase3Active
                      ? 'End-of-year review opens during Phase 3'
                      : isSelfEvaluationSubmitted
                      ? 'Self-evaluation comments submitted and locked'
                      : 'Editable only by the employee'
                  }
                >
                  {isFormLocked && !canSupervisorEdit
                    ? '(Form Locked)'
                    : !isPhase3Active
                    ? '(Opens in Phase 3)'
                    : isSelfEvaluationSubmitted
                    ? '(Submitted & Locked)'
                    : '(Editable by Employee)'}
                </span>
              )}
            </div>
            <textarea
              rows={4}
              disabled={!isPhase3SelfEditable}
              value={finalCommentsEmployee}
              onChange={(e) => setFinalCommentsEmployee(e.target.value)}
              placeholder="Summary of annual achievements, highlights, and growth..."
              title={
                !isPhase3SelfEditable
                  ? isFormLocked && !canSupervisorEdit
                    ? 'Evaluation form locked by your supervisor: end-of-year reflection cannot be edited.'
                    : !isPhase3Active
                    ? 'End-of-year review comments open during Phase 3 (End of Year).'
                    : isSelfEvaluationSubmitted
                    ? 'Self-evaluation has already been submitted and locked.'
                    : !canEmployeeEdit
                    ? 'End-of-year reflection can only be entered by the employee.'
                    : undefined
                  : undefined
              }
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Comments entered by Supervisor:
              </label>
              {!isPhase3SupervisorEditable && (
                <span
                  className="text-[11px] text-slate-500 italic cursor-help"
                  title={
                    !isPhase3Active
                      ? 'End-of-year review opens during Phase 3'
                      : !isSelfEvaluationSubmitted && !isAdmin
                      ? 'Awaiting employee self-evaluation submission before supervisor review'
                      : isFinalCompleted
                      ? 'Final review completed and locked'
                      : 'Supervisor review can only be entered by your supervisor or department leader'
                  }
                >
                  {!isPhase3Active
                    ? '(Opens in Phase 3)'
                    : !isSelfEvaluationSubmitted && !isAdmin
                    ? '(Awaiting Employee Self-Eval)'
                    : isFinalCompleted
                    ? '(Final Review Completed)'
                    : '(Editable by Supervisor)'}
                </span>
              )}
            </div>
            <textarea
              rows={4}
              disabled={!isPhase3SupervisorEditable}
              value={finalCommentsSupervisor}
              onChange={(e) => setFinalCommentsSupervisor(e.target.value)}
              placeholder="Comprehensive summary of employee performance and leadership observations..."
              title={
                !isPhase3SupervisorEditable
                  ? !isPhase3Active
                    ? 'End-of-year review comments open during Phase 3 (End of Year).'
                    : !isSelfEvaluationSubmitted && !isAdmin
                    ? 'Awaiting employee self-evaluation submission before supervisor review.'
                    : isFinalCompleted
                    ? 'Annual evaluation cycle is completed and officially locked.'
                    : !canSupervisorEdit
                    ? 'End-of-year summary can only be entered by your supervisor or department leader.'
                    : undefined
                  : undefined
              }
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
            />
          </div>
        </div>
      </section>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 py-3 px-4 shadow-lg z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Phase Actions:</span>
            {isFormLocked && !canSupervisorEdit && (
              <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Form Locked by Supervisor</span>
              </span>
            )}
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
                {!isSelfEvaluationSubmitted && !isStaff && ' — Awaiting Employee Self-Evaluation'}
                {isSelfEvaluationSubmitted && !isFinalCompleted && ' — Self-Evaluation Completed'}
                {isFinalCompleted && ' — Completed'}
              </span>
            )}
            {!currentPhaseInfo.isOpen && (
              <span className="text-xs text-slate-500 italic">Review window closed (Read-Only)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Supervisor Lock/Unlock Toggle Button */}
            {canSupervisorEdit && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleToggleFormLock}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5 ${
                  isFormLocked
                    ? 'bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold border border-amber-400 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
                title={
                  isFormLocked
                    ? 'Form is currently locked for the employee. Click to unlock.'
                    : 'Lock this form so the employee cannot make any changes.'
                }
              >
                {isFormLocked ? <Unlock className="w-3.5 h-3.5 text-amber-950" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
                <span>{isFormLocked ? 'Unlock Form' : 'Lock Form'}</span>
              </button>
            )}

            {/* Phase 1 Save / Submit */}
            {isPhase1Active && canSupervisorEdit && (
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
                  title={
                    !isCountValid
                      ? 'Please select between 4 and 8 responsibilities before submitting'
                      : !isWeightValid
                      ? 'Total weight must strictly equal 80 before submitting'
                      : undefined
                  }
                >
                  <Send className="w-3.5 h-3.5 inline mr-1" />
                  <span>Submit Phase 1</span>
                </button>
              </>
            )}
            {isPhase1Active && canEmployeeEdit && !canSupervisorEdit && (
              <button
                type="button"
                disabled={isSaving || isFormLocked}
                onClick={() => handleSavePhase1(false)}
                title={isFormLocked ? 'Form locked by supervisor: saving is disabled' : undefined}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5 inline mr-1" />
                <span>Save Draft (Responsibilities & Goals)</span>
              </button>
            )}

            {/* Phase 2 Save / Submit */}
            {(isPhase2EmployeeEditable || isPhase2SupervisorEditable) && (
              <>
                <button
                  type="button"
                  disabled={isSaving || (isFormLocked && !canSupervisorEdit)}
                  onClick={() => handleSavePhase2(false)}
                  title={isFormLocked && !canSupervisorEdit ? 'Form locked by supervisor: saving is disabled' : undefined}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving || (isFormLocked && !canSupervisorEdit)}
                  onClick={() => handleSavePhase2(true)}
                  title={isFormLocked && !canSupervisorEdit ? 'Form locked by supervisor: submitting is disabled' : undefined}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5 inline mr-1" />
                  <span>Submit Phase 2</span>
                </button>
              </>
            )}

            {/* Phase 3 Employee Self-Evaluation Actions */}
            {isPhase3SelfEditable && (
              <>
                <button
                  type="button"
                  disabled={isSaving || isFormLocked}
                  onClick={() => handleSavePhase3()}
                  title={isFormLocked ? 'Form locked by supervisor: saving is disabled' : undefined}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving || isFormLocked}
                  onClick={() => handleSavePhase3('self')}
                  title={isFormLocked ? 'Form locked by supervisor: submitting is disabled' : undefined}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5 inline mr-1" />
                  <span>Submit Self Evaluation</span>
                </button>
              </>
            )}

            {/* Phase 3 Supervisor Final Actions */}
            {isPhase3SupervisorEditable && (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePhase3()}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePhase3('supervisor')}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 inline mr-1" />
                  <span>Complete Final Evaluation</span>
                </button>
              </>
            )}

            <a
              href={`/api/evaluations/${evaluation.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 inline mr-1" />
              <span>Download PDF version</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
