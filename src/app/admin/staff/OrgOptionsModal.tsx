import { useState } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Save,
  X,
  Building2,
  Layers,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Check,
} from 'lucide-react';
import { updateOrgOptionsAction } from './actions';

interface OrgOptionsModalProps {
  initialCampuses: string[];
  initialDepartments: string[];
  onOptionsUpdated?: (campuses: string[], departments: string[]) => void;
  triggerButton?: React.ReactNode;
}

export default function OrgOptionsModal({
  initialCampuses,
  initialDepartments,
  onOptionsUpdated,
  triggerButton,
}: OrgOptionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [campuses, setCampuses] = useState<string[]>(initialCampuses);
  const [departments, setDepartments] = useState<string[]>(initialDepartments);
  const [newCampus, setNewCampus] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // In-line editing state for Campuses
  const [editingCampusIdx, setEditingCampusIdx] = useState<number | null>(null);
  const [editingCampusValue, setEditingCampusValue] = useState('');

  // In-line editing state for Departments
  const [editingDeptIdx, setEditingDeptIdx] = useState<number | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');

  // Track renames: { type, oldName, newName }
  const [renames, setRenames] = useState<
    { type: 'campus' | 'department'; oldName: string; newName: string }[]
  >([]);

  const handleOpen = () => {
    setCampuses(initialCampuses);
    setDepartments(initialDepartments);
    setNewCampus('');
    setNewDepartment('');
    setEditingCampusIdx(null);
    setEditingCampusValue('');
    setEditingDeptIdx(null);
    setEditingDeptValue('');
    setRenames([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsOpen(true);
  };

  const handleAddCampus = () => {
    const trimmed = newCampus.trim();
    if (!trimmed) return;
    if (campuses.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Campus "${trimmed}" already exists.`);
      return;
    }
    setCampuses([...campuses, trimmed]);
    setNewCampus('');
    setErrorMessage(null);
  };

  const handleStartCampusEdit = (idx: number) => {
    setEditingCampusIdx(idx);
    setEditingCampusValue(campuses[idx]);
    setErrorMessage(null);
  };

  const handleCancelCampusEdit = () => {
    setEditingCampusIdx(null);
    setEditingCampusValue('');
  };

  const handleSaveCampusEdit = (idx: number) => {
    const trimmed = editingCampusValue.trim();
    if (!trimmed) {
      setErrorMessage('Campus name cannot be empty.');
      return;
    }
    if (
      campuses.some((c, i) => i !== idx && c.toLowerCase() === trimmed.toLowerCase())
    ) {
      setErrorMessage(`Campus "${trimmed}" already exists.`);
      return;
    }
    const oldName = campuses[idx];
    if (oldName !== trimmed) {
      const updated = [...campuses];
      updated[idx] = trimmed;
      setCampuses(updated);
      setRenames((prev) => [...prev, { type: 'campus', oldName, newName: trimmed }]);
    }
    setEditingCampusIdx(null);
    setEditingCampusValue('');
    setErrorMessage(null);
  };

  const handleRemoveCampus = (index: number) => {
    if (campuses.length <= 1) {
      setErrorMessage('At least one campus option is required.');
      return;
    }
    if (editingCampusIdx === index) {
      handleCancelCampusEdit();
    }
    setCampuses(campuses.filter((_, i) => i !== index));
  };

  const handleAddDepartment = () => {
    const trimmed = newDepartment.trim();
    if (!trimmed) return;
    if (departments.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`Department "${trimmed}" already exists.`);
      return;
    }
    setDepartments([...departments, trimmed]);
    setNewDepartment('');
    setErrorMessage(null);
  };

  const handleStartDeptEdit = (idx: number) => {
    setEditingDeptIdx(idx);
    setEditingDeptValue(departments[idx]);
    setErrorMessage(null);
  };

  const handleCancelDeptEdit = () => {
    setEditingDeptIdx(null);
    setEditingDeptValue('');
  };

  const handleSaveDeptEdit = (idx: number) => {
    const trimmed = editingDeptValue.trim();
    if (!trimmed) {
      setErrorMessage('Department name cannot be empty.');
      return;
    }
    if (
      departments.some((d, i) => i !== idx && d.toLowerCase() === trimmed.toLowerCase())
    ) {
      setErrorMessage(`Department "${trimmed}" already exists.`);
      return;
    }
    const oldName = departments[idx];
    if (oldName !== trimmed) {
      const updated = [...departments];
      updated[idx] = trimmed;
      setDepartments(updated);
      setRenames((prev) => [...prev, { type: 'department', oldName, newName: trimmed }]);
    }
    setEditingDeptIdx(null);
    setEditingDeptValue('');
    setErrorMessage(null);
  };

  const handleRemoveDepartment = (index: number) => {
    if (departments.length <= 1) {
      setErrorMessage('At least one department option is required.');
      return;
    }
    if (editingDeptIdx === index) {
      handleCancelDeptEdit();
    }
    setDepartments(departments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Auto-commit any currently active inline edit
      let currentCampuses = [...campuses];
      let currentDepartments = [...departments];
      let currentRenames = [...renames];

      if (editingCampusIdx !== null) {
        const trimmed = editingCampusValue.trim();
        if (
          trimmed &&
          !currentCampuses.some(
            (c, i) => i !== editingCampusIdx && c.toLowerCase() === trimmed.toLowerCase()
          )
        ) {
          const oldName = currentCampuses[editingCampusIdx];
          if (oldName !== trimmed) {
            currentCampuses[editingCampusIdx] = trimmed;
            currentRenames.push({ type: 'campus', oldName, newName: trimmed });
          }
        }
      }

      if (editingDeptIdx !== null) {
        const trimmed = editingDeptValue.trim();
        if (
          trimmed &&
          !currentDepartments.some(
            (d, i) => i !== editingDeptIdx && d.toLowerCase() === trimmed.toLowerCase()
          )
        ) {
          const oldName = currentDepartments[editingDeptIdx];
          if (oldName !== trimmed) {
            currentDepartments[editingDeptIdx] = trimmed;
            currentRenames.push({ type: 'department', oldName, newName: trimmed });
          }
        }
      }

      const res = await updateOrgOptionsAction({
        campuses: currentCampuses,
        departments: currentDepartments,
        renames: currentRenames,
      });

      if (res.success && res.campuses && res.departments) {
        setSuccessMessage('Campus and department options saved successfully!');
        setCampuses(res.campuses);
        setDepartments(res.departments);
        setEditingCampusIdx(null);
        setEditingDeptIdx(null);
        setRenames([]);
        if (onOptionsUpdated) {
          onOptionsUpdated(res.campuses, res.departments);
        }
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMessage(null);
        }, 800);
      } else {
        setErrorMessage(res.error || 'Failed to save options.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save options.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={handleOpen}>{triggerButton}</div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span>Manage Campuses & Departments</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4 text-blue-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Manage Campuses & Departments
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure standard dropdown options available when adding or editing staff members
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campuses Section */}
                <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Building2 className="w-4 h-4 text-blue-800" />
                      <span>Campuses ({campuses.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Click ✏️ to edit</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCampus}
                      onChange={(e) => setNewCampus(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCampus())}
                      placeholder="e.g. Hongqiao ECE"
                      className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCampus}
                      className="px-3 py-2 text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-lg transition cursor-pointer"
                      title="Add Campus"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {campuses.map((c, idx) => {
                      const isEditing = editingCampusIdx === idx;
                      return (
                        <div
                          key={`campus-${c}-${idx}`}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs shadow-2xs transition ${
                            isEditing
                              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={editingCampusValue}
                                onChange={(e) => setEditingCampusValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveCampusEdit(idx);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelCampusEdit();
                                  }
                                }}
                                autoFocus
                                className="flex-1 text-xs border border-blue-400 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveCampusEdit(idx)}
                                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition cursor-pointer"
                                title="Apply Change"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelCampusEdit}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium truncate mr-2 text-slate-900" title={c}>
                                {c}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartCampusEdit(idx)}
                                  className="text-slate-400 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                  title="Edit Campus Name"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCampus(idx)}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition cursor-pointer"
                                  title="Remove Campus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Departments Section */}
                <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-emerald-800" />
                      <span>Departments ({departments.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Click ✏️ to edit</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDepartment())}
                      placeholder="e.g. Performing Arts"
                      className="flex-1 text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddDepartment}
                      className="px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition cursor-pointer"
                      title="Add Department"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {departments.map((d, idx) => {
                      const isEditing = editingDeptIdx === idx;
                      return (
                        <div
                          key={`dept-${d}-${idx}`}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs shadow-2xs transition ${
                            isEditing
                              ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="text"
                                value={editingDeptValue}
                                onChange={(e) => setEditingDeptValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveDeptEdit(idx);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelDeptEdit();
                                  }
                                }}
                                autoFocus
                                className="flex-1 text-xs border border-emerald-400 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDeptEdit(idx)}
                                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition cursor-pointer"
                                title="Apply Change"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelDeptEdit}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium truncate mr-2 text-slate-900" title={d}>
                                {d}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartDeptEdit(idx)}
                                  className="text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 p-1 rounded transition cursor-pointer"
                                  title="Edit Department Name"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDepartment(idx)}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition cursor-pointer"
                                  title="Remove Department"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Organization Options'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
