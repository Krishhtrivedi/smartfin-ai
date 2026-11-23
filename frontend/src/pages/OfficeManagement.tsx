import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Calendar,
  Receipt,
  CheckSquare,
  FolderOpen,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { Employee, Attendance, Expense, Task, DocumentItem } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const OfficeManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'expenses' | 'tasks' | 'documents'>('expenses');

  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New Expense Modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState('OFFICE_SUPPLIES');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // New Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskAssignee, setTaskAssignee] = useState<number>(1);
  const [taskDueDate, setTaskDueDate] = useState('');

  // Upload Doc Modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('INVOICE');
  const [docFile, setDocFile] = useState<File | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empList, attList, expList, tskList, docList] = await Promise.all([
        api.getEmployees(),
        api.getAttendance(),
        api.getExpenses(),
        api.getTasks(),
        api.getDocuments()
      ]);
      setEmployees(empList);
      setAttendance(attList);
      setExpenses(expList);
      setTasks(tskList);
      setDocuments(docList);
      if (empList.length > 0) setTaskAssignee(empList[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleApproveExpense = async (id: number, action: 'APPROVED' | 'REJECTED') => {
    try {
      await api.approveExpense(id, action);
      await fetchData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExpense({
        title: expTitle,
        category: expCategory,
        amount: parseFloat(expAmount),
        expense_date: expDate,
        employee_id: employees[0]?.id || 1,
      });
      setExpenseModalOpen(false);
      setExpTitle('');
      setExpAmount('');
      await fetchData();
    } catch (err: any) {
      alert(`Expense creation failed: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTask({
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        assigned_to_employee_id: taskAssignee,
        due_date: taskDueDate || undefined,
        status: 'TODO'
      });
      setTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      await fetchData();
    } catch (err: any) {
      alert(`Task creation failed: ${err.message}`);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await fetchData();
    } catch (err: any) {
      alert(`Task update failed: ${err.message}`);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    try {
      const formData = new FormData();
      formData.append('title', docTitle);
      formData.append('document_category', docCategory);
      formData.append('file', docFile);
      await api.uploadDocument(formData);
      setDocModalOpen(false);
      setDocTitle('');
      setDocFile(null);
      await fetchData();
    } catch (err: any) {
      alert(`Document upload failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none">
      {/* Module Navigation Tabs */}
      <div className="bg-white dark:bg-[#131C2E] p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-1 overflow-x-auto shadow-xs">
        {[
          { id: 'expenses', label: 'Expense Reimbursements', icon: Receipt },
          { id: 'tasks', label: 'Office Tasks & Kanban', icon: CheckSquare },
          { id: 'employees', label: 'Employee Directory', icon: Users },
          { id: 'attendance', label: 'Attendance & Leave', icon: Calendar },
          { id: 'documents', label: 'Document Repository', icon: FolderOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-navy-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. EXPENSES VIEW */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-950">Corporate Expense Claims & Approvals</h3>
              <p className="text-xs text-slate-500">Employee expense vouchers with approval workflow</p>
            </div>
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit New Expense</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A253A]/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Title / Purpose</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Expense Date</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Manager Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]/60">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{exp.title}</p>
                      {exp.remarks && <p className="text-[10px] text-slate-400 mt-0.5">{exp.remarks}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                        {exp.category.toLowerCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{exp.expense_date}</td>
                    <td className="py-3 px-4 text-right font-bold text-navy-950">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={exp.status === 'APPROVED' ? 'success' : exp.status === 'REJECTED' ? 'danger' : 'warning'}>
                        {exp.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {exp.status === 'PENDING' && (user?.role === 'admin' || user?.role === 'manager') ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleApproveExpense(exp.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproveExpense(exp.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {exp.approved_by ? `Approved by ${exp.approved_by}` : 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. TASKS & KANBAN VIEW */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-950">Accounting & Finance Tasks</h3>
              <p className="text-xs text-slate-500">Track reconciliations, statutory deadlines & office deliverables</p>
            </div>
            <button
              onClick={() => setTaskModalOpen(true)}
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as const).map((colStatus) => {
              const colTasks = tasks.filter((t) => t.status === colStatus);
              return (
                <div key={colStatus} className="bg-slate-100/70 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {colStatus.toLowerCase().replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold bg-white dark:bg-[#131C2E] text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {colTasks.map((t) => (
                      <div key={t.id} className="bg-white dark:bg-[#131C2E] p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            t.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                            t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-brand-700'
                          }`}>
                            {t.priority}
                          </span>
                          {t.due_date && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {t.due_date}
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{t.title}</p>
                        {t.description && <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-400">Move status:</span>
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                            className="text-[10px] font-medium border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-[#1A253A]"
                          >
                            <option value="TODO">To-Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EMPLOYEES VIEW */}
      {activeTab === 'employees' && (
        <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-950">Employee Master Directory</h3>
            <span className="text-xs text-slate-500">{employees.length} active members</span>
          </div>

          <table className="w-full min-w-[750px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1A253A] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4 text-right">Monthly Compensation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]/60">
                  <td className="py-3 px-4 font-mono font-bold text-brand-600">{emp.employee_code}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{emp.first_name} {emp.last_name}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{emp.designation}</p>
                    <p className="text-[10px] text-slate-400">{emp.department}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    <p>{emp.email}</p>
                    <p className="text-[10px] text-slate-400">{emp.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{emp.joining_date}</td>
                  <td className="py-3 px-4 text-right font-bold text-navy-950">₹{emp.salary.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. ATTENDANCE VIEW */}
      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-950">Daily Attendance & Leave Log</h3>
            <span className="text-xs text-slate-500">{attendance.length} records</span>
          </div>

          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1A253A] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Hours Logged</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.map((att) => (
                <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]/60">
                  <td className="py-3 px-4 font-mono font-medium text-slate-600 dark:text-slate-400">{att.date}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">EMP-00{att.employee_id}</td>
                  <td className="py-3 px-4">
                    <Badge variant={att.status === 'PRESENT' ? 'success' : att.status === 'ON_LEAVE' ? 'warning' : 'neutral'}>
                      {att.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{att.check_in || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{att.check_out || '—'}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{att.total_hours} hrs</td>
                  <td className="py-3 px-4 text-slate-400">{att.notes || att.leave_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. DOCUMENTS VIEW */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-950">Corporate Document & Invoice Repository</h3>
              <p className="text-xs text-slate-500">Secure storage for audit policies, statements & statutory files</p>
            </div>
            <button
              onClick={() => setDocModalOpen(true)}
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {doc.document_category}
                    </span>
                    <span className="text-[10px] text-slate-400">{(doc.file_size / 1024).toFixed(0)} KB</span>
                  </div>
                  <h4 className="text-xs font-bold text-navy-950 line-clamp-2">{doc.title}</h4>
                  {doc.tags && <p className="text-[10px] text-slate-500 mt-1">Tags: {doc.tags}</p>}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Role: {doc.access_role}</span>
                  <span className="text-brand-600 font-semibold cursor-pointer hover:underline">Download</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Modal */}
      <Modal isOpen={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Submit Expense Voucher">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Purpose / Title</label>
            <input
              type="text"
              required
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="e.g. Client Dinner, Zoom Subscription..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50 dark:bg-[#1A253A]"
            >
              <option value="OFFICE_SUPPLIES">Office Supplies</option>
              <option value="TRAVEL">Travel & Logistics</option>
              <option value="SOFTWARE">Software & Cloud Services</option>
              <option value="MEALS">Meals & Client Entertainment</option>
              <option value="UTILITIES">Utilities & Power</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date</label>
            <input
              type="date"
              required
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setExpenseModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-xs font-semibold text-white rounded-lg"
            >
              Submit Voucher
            </button>
          </div>
        </form>
      </Modal>

      {/* Task Modal */}
      <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Create New Office Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Audit Form 26Q Draft"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Instructions</label>
            <textarea
              rows={2}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A253A] focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee</label>
              <select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(parseInt(e.target.value))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A253A] focus:outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-xs font-semibold text-white rounded-lg"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Doc Modal */}
      <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="Upload Corporate Document">
        <form onSubmit={handleUploadDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Master Services Agreement 2026"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A253A] focus:outline-none"
            >
              <option value="INVOICE">Tax Invoice</option>
              <option value="CONTRACT">Contract & Agreement</option>
              <option value="TAX_RECORD">Statutory Tax Filing</option>
              <option value="BANK_STATEMENT">Bank Statement</option>
              <option value="POLICY">Corporate Policy</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select File</label>
            <input
              type="file"
              required
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setDocModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-xs font-semibold text-white rounded-lg"
            >
              Upload Document
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
