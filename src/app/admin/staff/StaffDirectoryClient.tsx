'use client';

import { useState } from 'react';
import {
  updateStaffProfileAction,
  createStaffProfileAction,
  deleteStaffProfileAction,
} from './actions';
import { Users, UserPlus, Edit, Search, CheckCircle2, Shield, X, Trash2, Settings } from 'lucide-react';
import { Role } from '@prisma/client';
import ImpersonateButton from '@/components/ImpersonateButton';
import { useRouter } from 'next/navigation';
import OrgOptionsModal from './OrgOptionsModal';
import { DEFAULT_CAMPUSES, DEFAULT_DEPARTMENTS } from '@/lib/org-constants';

interface StaffDirectoryClientProps {
  staffList: any[];
  allJDs: { id: string; title: string }[];
  allSupervisors: { id: string; fullName: string; email: string }[];
  allDeptHeads: { id: string; fullName: string; email: string }[];
  initialCampuses?: string[];
  initialDepartments?: string[];
}

export default function StaffDirectoryClient({
  staffList,
  allJDs,
  allSupervisors,
  allDeptHeads,
  initialCampuses,
  initialDepartments,
}: StaffDirectoryClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [campuses, setCampuses] = useState<string[]>(
    initialCampuses && initialCampuses.length > 0 ? initialCampuses : DEFAULT_CAMPUSES
  );
  const [departments, setDepartments] = useState<string[]>(
    initialDepartments && initialDepartments.length > 0 ? initialDepartments : DEFAULT_DEPARTMENTS
  );

  const handleOptionsUpdated = (newCampuses: string[], newDepts: string[]) => {
    setCampuses(newCampuses);
    setDepartments(newDepts);
    router.refresh();
  };

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [campus, setCampus] = useState(campuses[0] || 'Systemwide');
  const [department, setDepartment] = useState(departments[0] || 'Technology and Innovation');
  const [jobDescriptionId, setJobDescriptionId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');
  const [role, setRole] = useState<Role>(Role.STAFF);

  const openEditModal = (staff: any) => {
    setSelectedStaff(staff);
    setIsCreating(false);
    setFullName(staff.fullName);
    setEmail(staff.email);
    setCampus(staff.campus);
    setDepartment(staff.department);
    setJobDescriptionId(staff.jobDescriptionId || '');
    setSupervisorId(staff.supervisorId || '');
    setDeptHeadId(staff.deptHeadId || '');
    setRole(staff.user?.role || Role.STAFF);
  };

  const openCreateModal = () => {
    setSelectedStaff(null);
    setIsCreating(true);
    setFullName('');
    setEmail('');
    setCampus(campuses[0] || 'Systemwide');
    setDepartment(departments[0] || 'Technology and Innovation');
    setJobDescriptionId('');
    setSupervisorId('');
    setDeptHeadId('');
    setRole(Role.STAFF);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (isCreating) {
        await createStaffProfileAction({
          fullName,
          email,
          campus,
          department,
          jobDescriptionId: jobDescriptionId || null,
          supervisorId: supervisorId || null,
          deptHeadId: deptHeadId || null,
          role,
        });
      } else if (selectedStaff) {
        await updateStaffProfileAction(selectedStaff.id, {
          fullName,
          campus,
          department,
          jobDescriptionId: jobDescriptionId || null,
          supervisorId: supervisorId || null,
          deptHeadId: deptHeadId || null,
          role,
        });
      }
      setSelectedStaff(null);
      setIsCreating(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error saving staff profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (staff: any) => {
    const confirmed = confirm(
      `Are you sure you want to permanently delete ${staff.fullName} (${staff.email})?\n\nThis will remove their staff profile and evaluation records.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(staff.id);
      await deleteStaffProfileAction(staff.id);
      if (selectedStaff?.id === staff.id) {
        setSelectedStaff(null);
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff member');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.jobDescription?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by staff name, email, department, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OrgOptionsModal
            initialCampuses={campuses}
            initialDepartments={departments}
            onOptionsUpdated={handleOptionsUpdated}
          />

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Assigned Job Description</th>
              <th className="py-3 px-4">Reports To (Supervisor)</th>
              <th className="py-3 px-4">Dept Head</th>
              <th className="py-3 px-4">Campus / Dept</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.map((staff) => (
              <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {staff.fullName}
                  <div className="text-[11px] text-slate-400 font-normal">{staff.email}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {staff.user?.role || 'STAFF'}
                  </span>
                </td>
                <td className="py-3 px-4 font-medium text-slate-800">
                  {staff.jobDescription?.title || (
                    <span className="text-amber-600 font-normal italic">No JD linked</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {staff.supervisor?.fullName || (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {staff.deptHead?.fullName || (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {staff.campus} &bull; {staff.department}
                </td>
                <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                  <ImpersonateButton staffId={staff.id} staffName={staff.fullName} />
                  <button
                    type="button"
                    onClick={() => openEditModal(staff)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === staff.id}
                    onClick={() => handleDeleteStaff(staff)}
                    title="Delete Staff Member"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded border border-rose-200 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Edit / Create */}
      {(selectedStaff || isCreating) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">
                {isCreating ? 'Add New Staff Member' : `Edit Profile: ${fullName}`}
              </h2>
              <button
                onClick={() => {
                  setSelectedStaff(null);
                  setIsCreating(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!isCreating}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@scis-china.org"
                    className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus *</label>
                  <select
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    {campus && !campuses.includes(campus) && (
                      <option value={campus}>{campus}</option>
                    )}
                    {campuses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    {department && !departments.includes(department) && (
                      <option value={department}>{department}</option>
                    )}
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end -mt-1">
                <OrgOptionsModal
                  initialCampuses={campuses}
                  initialDepartments={departments}
                  onOptionsUpdated={handleOptionsUpdated}
                  triggerButton={
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-blue-900 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3 text-blue-800" />
                      <span>Configure Campuses & Departments</span>
                    </button>
                  }
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assign Job Description (JD)
                </label>
                <select
                  value={jobDescriptionId}
                  onChange={(e) => setJobDescriptionId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                >
                  <option value="">-- Select a Job Description --</option>
                  {allJDs.map((jd) => (
                    <option key={jd.id} value={jd.id}>
                      {jd.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supervisor</label>
                  <select
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    <option value="">-- No Supervisor --</option>
                    {allSupervisors
                      .filter((s) => s.id !== selectedStaff?.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department Head
                  </label>
                  <select
                    value={deptHeadId}
                    onChange={(e) => setDeptHeadId(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    <option value="">-- No Dept Head --</option>
                    {allDeptHeads
                      .filter((s) => s.id !== selectedStaff?.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full border border-slate-300 rounded p-2 font-semibold"
                >
                  <option value="STAFF">STAFF (Self-Evaluation & JD View)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Manages Direct Reports)</option>
                  <option value="DEPT_HEAD">DEPT_HEAD (Department Sign-Off)</option>
                  <option value="HR_ADMIN">HR_ADMIN (JDs, Schedules & Reporting Lines)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full System Authority)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaff(null);
                    setIsCreating(false);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded font-bold shadow"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
