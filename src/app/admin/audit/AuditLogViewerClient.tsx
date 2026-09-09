'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, RotateCcw, ChevronDown, ChevronRight, User, Shield, Activity } from 'lucide-react';

interface AuditLogItem {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  diffData: any;
  ipAddress: string | null;
  createdAt: Date | string;
}

interface Props {
  logs: AuditLogItem[];
}

export default function AuditLogViewerClient({ logs }: Props) {
  const [userQuery, setUserQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Extract unique actions & entity types
  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  const uniqueEntityTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.entityType));
    return Array.from(set).sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // User filter
      if (userQuery.trim()) {
        const query = userQuery.trim().toLowerCase();
        const matchesUser =
          (log.userName && log.userName.toLowerCase().includes(query)) ||
          (log.userEmail && log.userEmail.toLowerCase().includes(query));
        if (!matchesUser) return false;
      }

      // Action filter
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }

      // Entity type filter
      if (selectedEntityType !== 'ALL' && log.entityType !== selectedEntityType) {
        return false;
      }

      return true;
    });
  }, [logs, userQuery, selectedAction, selectedEntityType]);

  const handleResetFilters = () => {
    setUserQuery('');
    setSelectedAction('ALL');
    setSelectedEntityType('ALL');
  };

  const isFiltered = userQuery.trim() !== '' || selectedAction !== 'ALL' || selectedEntityType !== 'ALL';

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Filter className="w-4 h-4 text-blue-900" />
            <span>Filter Audit Records</span>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Filter by User */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Search by User / Email
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="e.g. zren@scis-china.org..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Filter by Action */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by Action
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Actions ({uniqueActions.length})</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Entity Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter by Entity Type
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Entities ({uniqueEntityTypes.length})</option>
              {uniqueEntityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredLogs.length}</strong> of{' '}
            <strong className="text-slate-800">{logs.length}</strong> total events
          </span>
          {isFiltered && <span className="text-blue-900 font-semibold">(Filter Active)</span>}
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider">
              <th className="py-3 px-4 w-44">Timestamp (CST)</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity Type</th>
              <th className="py-3 px-4">Details / Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No audit records match the selected filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const hasDiff = log.diffData && Object.keys(log.diffData).length > 0;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap align-top">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        timeZone: 'Asia/Shanghai',
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <div className="font-semibold text-slate-900">
                        {log.userName || log.userEmail || 'System'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">{log.userEmail}</div>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <span className="inline-block font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium align-top">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4 align-top max-w-md">
                      {hasDiff ? (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 hover:text-blue-700 cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                            <span>{isExpanded ? 'Hide Details' : 'View Payload Diff'}</span>
                          </button>

                          {isExpanded && (
                            <pre className="mt-1.5 p-2.5 bg-slate-900 text-emerald-300 font-mono text-[10px] rounded-lg overflow-x-auto leading-relaxed border border-slate-700">
                              {JSON.stringify(log.diffData, null, 2)}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">--</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
