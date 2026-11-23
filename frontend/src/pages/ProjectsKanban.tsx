import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ProjectItem } from '../types';
import {
  FolderKanban, Plus, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  Search, Calendar, User, ArrowRight, BarChart3, CheckSquare, Layers
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

const TASK_STATUSES = [
  { key: 'TODO', label: 'To Do', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-300' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  { key: 'REVIEW', label: 'Review & QA', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  { key: 'COMPLETED', label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
];

export const ProjectsKanban: React.FC = () => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Project Form
  const [projName, setProjName] = useState('');
  const [projCode, setProjCode] = useState('');
  const [projCustomerId, setProjCustomerId] = useState<number | undefined>(undefined);
  const [projManagerId, setProjManagerId] = useState<number | undefined>(undefined);
  const [projPriority, setProjPriority] = useState('HIGH');
  const [projBudget, setProjBudget] = useState('100000');
  const [projDueDate, setProjDueDate] = useState('');
  const [projDesc, setProjDesc] = useState('');

  // Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState<number | undefined>(undefined);
  const [taskPriority, setTaskPriority] = useState('HIGH');
  const [taskDueDate, setTaskDueDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [projs, emps, custs] = await Promise.all([
        api.getProjects(),
        api.getEmployees(),
        api.getCustomers({ limit: 100 })
      ]);
      setProjects(projs);
      setEmployees(emps);
      setCustomers(custs);

      const activeProjId = selectedProjectId || (projs.length > 0 ? projs[0].id : null);
      if (activeProjId) {
        setSelectedProjectId(activeProjId);
        const taskData = await api.getProjectTasks(activeProjId);
        setTasks(taskData);
      }
    } catch (err: any) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectProject = async (id: number) => {
    setSelectedProjectId(id);
    try {
      const taskData = await api.getProjectTasks(id);
      setTasks(taskData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProject({
        name: projName,
        code: projCode.toUpperCase(),
        customer_id: projCustomerId ? Number(projCustomerId) : undefined,
        manager_employee_id: projManagerId ? Number(projManagerId) : undefined,
        priority: projPriority,
        budget: parseFloat(projBudget) || 0,
        due_date: projDueDate || undefined,
        description: projDesc || undefined
      });
      setProjectModalOpen(false);
      setProjName('');
      setProjCode('');
      setProjDesc('');
      await loadData();
    } catch (err: any) {
      alert(`Failed to create project: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setSubmitting(true);
    try {
      await api.createProjectTask(selectedProjectId, {
        title: taskTitle,
        description: taskDesc || undefined,
        assigned_to_employee_id: taskAssigneeId ? Number(taskAssigneeId) : (employees[0]?.id || 1),
        priority: taskPriority,
        status: 'TODO',
        due_date: taskDueDate || undefined
      });
      setTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      const updatedTasks = await api.getProjectTasks(selectedProjectId);
      setTasks(updatedTasks);
    } catch (err: any) {
      alert(`Failed to create task: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await api.updateProjectTaskStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const activeProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ECE9E3]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#E65909] font-bold">
              Operations & Engagements
            </span>
            <span className="text-[#8B97A3]">/</span>
            <span className="text-xs text-[#5D646C]">Project Delivery & Task Board</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A2F46] font-bold mt-1">
            Projects & Tasks Kanban
          </h1>
          <p className="text-xs text-[#5D646C] mt-0.5">
            Deliver audits, business turnarounds, and tax filings on time with real-time status tracking.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 border border-[#C5CBD2] text-[#1A2F46] text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setProjectModalOpen(true)}
            className="px-4 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Projects Horizontal Slider / Cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A2F46]">
            Active Engagements ({projects.length})
          </h2>
          <span className="text-[11px] text-[#5D646C]">Select an engagement to view its task workflow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {projects.map((p) => {
            const isSelected = p.id === selectedProjectId;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectProject(p.id)}
                className={`p-3.5 bg-white border rounded-[3px] cursor-pointer transition-all ${
                  isSelected ? 'border-[#E65909] ring-2 ring-[#E65909]/20 shadow-md' : 'border-[#C5CBD2] hover:border-[#8B97A3]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F6F3EE] text-[#5D646C] font-bold">
                    {p.code}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    p.priority === 'URGENT' || p.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {p.priority}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-[#1A2F46] mt-2 line-clamp-1">{p.name}</h3>
                <div className="text-[11px] text-[#5D646C] mt-0.5 line-clamp-1">
                  Client: <strong>{p.client_name || 'Vichar Vimarsh Internal'}</strong>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-mono text-[#5D646C] mb-1">
                    <span>Progress</span>
                    <span>{p.completion_percentage}% ({p.completed_tasks}/{p.task_count} tasks)</span>
                  </div>
                  <div className="w-full bg-[#ECE9E3] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, p.completion_percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Project Details & Task Board */}
      {activeProject ? (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#E65909]/10 text-[#E65909]">
                  {activeProject.code}
                </span>
                <span className="text-xs text-[#8B97A3]">·</span>
                <span className="text-xs text-[#5D646C]">Project Manager: <strong>{activeProject.manager_name || 'Unassigned'}</strong></span>
                {activeProject.due_date && (
                  <>
                    <span className="text-xs text-[#8B97A3]">·</span>
                    <span className="text-xs text-[#5D646C] flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-[#8B97A3]" /> Due: {activeProject.due_date}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-bold font-serif text-[#1A2F46] mt-1">
                {activeProject.name}
              </h2>
              {activeProject.description && (
                <p className="text-xs text-[#5D646C] mt-0.5">{activeProject.description}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTaskModalOpen(true)}
                className="px-4 py-2 bg-[#1A2F46] text-white text-xs font-semibold rounded-[2px] hover:bg-[#0D2035] flex items-center space-x-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-[#E65909]" />
                <span>Add Task to Project</span>
              </button>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {TASK_STATUSES.map((col) => {
              const colTasks = tasks.filter(t => t.status === col.key);

              return (
                <div key={col.key} className="bg-[#F6F3EE] rounded-[3px] border border-[#C5CBD2] flex flex-col min-h-[420px]">
                  <div className={`p-2.5 border-b ${col.border} ${col.bg} rounded-t-[3px] flex items-center justify-between`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                      {col.label}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#C5CBD2] text-[#1A2F46] font-bold">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-[#8B97A3] border border-dashed border-[#C5CBD2] rounded-[2px]">
                        No tasks in this lane
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-white border border-[#C5CBD2] rounded-[2px] hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="text-xs font-bold text-[#1A2F46]">{task.title}</h4>
                            <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                              task.priority === 'HIGH' || task.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-[#5D646C] mt-1 line-clamp-2">{task.description}</p>
                          )}

                          <div className="mt-2 pt-2 border-t border-[#ECE9E3] flex items-center justify-between text-[10px]">
                            <span className="text-[#8B97A3] font-mono flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />
                              {task.assigned_to_name || 'Staff'}
                            </span>

                            {/* Status changer dropdown */}
                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                              className="bg-white border border-[#C5CBD2] rounded px-1.5 py-0.5 text-[10px] text-[#1A2F46]"
                            >
                              {TASK_STATUSES.map(s => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white border border-[#C5CBD2] rounded-[3px]">
          <p className="text-xs text-[#5D646C]">No projects found. Click "New Project" to create your first engagement.</p>
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title="Initialize New Engagement / Project"
        subtitle="Set client, code, budget, and timeline"
      >
        <form onSubmit={handleCreateProject} className="space-y-3 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Project Name *</label>
              <input
                type="text"
                required
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="e.g. FY 2026-27 Statutory Audit"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Project Code *</label>
              <input
                type="text"
                required
                value={projCode}
                onChange={(e) => setProjCode(e.target.value.toUpperCase())}
                placeholder="PRJ-AUDIT-2026"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Client / Customer</label>
              <select
                value={projCustomerId || ''}
                onChange={(e) => setProjCustomerId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="">-- Internal / General Project --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.gstin || c.pan || 'N/A'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Engagement Manager</label>
              <select
                value={projManagerId || ''}
                onChange={(e) => setProjManagerId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="">-- Select Staff Manager --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Priority</label>
              <select
                value={projPriority}
                onChange={(e) => setProjPriority(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Budget (₹)</label>
              <input
                type="number"
                value={projBudget}
                onChange={(e) => setProjBudget(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Target Due Date</label>
              <input
                type="date"
                value={projDueDate}
                onChange={(e) => setProjDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Scope & Objectives</label>
            <textarea
              rows={2}
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              placeholder="Scope of work, deliverables, and audit period..."
              className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3]">
            <button
              type="button"
              onClick={() => setProjectModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] text-xs font-semibold rounded-[2px] text-[#5D646C] hover:bg-[#F6F3EE]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Engagement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* New Task Modal */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Add Task to Engagement"
        subtitle={`Assign task under ${activeProject?.name}`}
      >
        <form onSubmit={handleCreateTask} className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Verify GSTR-2B ITC vs Purchase Register"
              className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Assignee</label>
              <select
                value={taskAssigneeId || ''}
                onChange={(e) => setTaskAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Target Due Date</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Task Instructions</label>
            <textarea
              rows={2}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Clear instructions for the employee..."
              className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3]">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] text-xs font-semibold rounded-[2px] text-[#5D646C] hover:bg-[#F6F3EE]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
