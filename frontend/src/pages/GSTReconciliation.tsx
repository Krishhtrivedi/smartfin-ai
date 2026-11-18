import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Upload,
  RefreshCw,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { GSTRecord } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const GSTReconciliation: React.FC = () => {
  const [records, setRecords] = useState<GSTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  
  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GSTRecord | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  
  // Upload form state
  const [uploadType, setUploadType] = useState<'PURCHASE_REGISTER' | 'GSTR2B'>('GSTR2B');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.getGSTRecords({
        match_status: statusFilter !== 'ALL' ? statusFilter : undefined,
        record_type: typeFilter !== 'ALL' ? typeFilter : undefined,
        search: search || undefined,
      });
      setRecords(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, typeFilter]);

  const handleRunReconciliation = async () => {
    setReconciling(true);
    try {
      await api.runGSTReconciliation();
      await fetchRecords();
    } catch (err: any) {
      alert(`Error running reconciliation: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('record_type', uploadType);
      formData.append('return_period', '112026');
      formData.append('financial_year', '2026-27');

      const res = await api.uploadGSTFile(formData);
      setUploadMessage(res.message);
      setSelectedFile(null);
      await fetchRecords();
      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadMessage(null);
      }, 1500);
    } catch (err: any) {
      setUploadMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleVerifySubmit = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedRecord) return;
    try {
      await api.verifyGSTRecord(selectedRecord.id, action, verifyNotes);
      setVerifyModalOpen(false);
      setSelectedRecord(null);
      setVerifyNotes('');
      await fetchRecords();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  // Stats calculation
  const stats = {
    total: records.length,
    fully_matched: records.filter((r) => r.match_status === 'FULLY_MATCHED').length,
    missing_2b: records.filter((r) => r.match_status === 'MISSING_IN_GSTR2B').length,
    missing_books: records.filter((r) => r.match_status === 'MISSING_IN_BOOKS').length,
    mismatch: records.filter((r) => r.match_status === 'TAX_MISMATCH').length,
    itc_at_risk: records
      .filter((r) => r.match_status === 'MISSING_IN_GSTR2B' || r.match_status === 'TAX_MISMATCH')
      .reduce((sum, r) => sum + r.total_tax, 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULLY_MATCHED':
        return <Badge variant="success">Fully Matched</Badge>;
      case 'PARTIALLY_MATCHED':
        return <Badge variant="info">Partially Matched</Badge>;
      case 'MISSING_IN_GSTR2B':
        return <Badge variant="danger">Missing in GSTR-2B</Badge>;
      case 'MISSING_IN_BOOKS':
        return <Badge variant="warning">Missing in Books</Badge>;
      case 'TAX_MISMATCH':
        return <Badge variant="danger">Tax Mismatch</Badge>;
      case 'DUPLICATE':
        return <Badge variant="danger">Duplicate</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-600" />
            <span>GSTR-2B vs Purchase Register 2-Way Reconciliation Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-compares GSTIN, invoice number, dates, taxable amount & taxes within ₹1 tolerance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors border border-slate-200"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel / 2B</span>
          </button>

          <button
            onClick={handleRunReconciliation}
            disabled={reconciling}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            <span>{reconciling ? 'Reconciling...' : 'Run Auto-Reconcile'}</span>
          </button>

          <button
            onClick={() => api.exportGSTExcel()}
            className="px-3 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Records</p>
          <p className="text-xl font-bold text-navy-950 mt-1">{stats.total}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Fully Matched</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.fully_matched}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Missing in GSTR-2B</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{stats.missing_2b}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Missing in Books</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{stats.missing_books}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">ITC at Risk</p>
          <p className="text-xl font-bold text-rose-600 mt-1">₹{stats.itc_at_risk.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filters:</span>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
          >
            <option value="ALL">All Match Statuses</option>
            <option value="FULLY_MATCHED">Fully Matched</option>
            <option value="MISSING_IN_GSTR2B">Missing in GSTR-2B (ITC At Risk)</option>
            <option value="MISSING_IN_BOOKS">Missing in Books (Unclaimed ITC)</option>
            <option value="TAX_MISMATCH">Tax Mismatch</option>
            <option value="DUPLICATE">Duplicate</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-slate-50"
          >
            <option value="ALL">All Record Types</option>
            <option value="PURCHASE_REGISTER">Purchase Register (Books)</option>
            <option value="GSTR2B">GSTR-2B (Govt Portal)</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
            placeholder="Search Supplier, GSTIN, Invoice No..."
            className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full md:w-72"
          />
        </div>
      </div>

      {/* Main Reconciliation Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Supplier & GSTIN</th>
                <th className="py-3 px-4">Invoice No & Date</th>
                <th className="py-3 px-4 text-right">Taxable Val (₹)</th>
                <th className="py-3 px-4 text-right">CGST / SGST</th>
                <th className="py-3 px-4 text-right">IGST</th>
                <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    Loading GST records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching GST records found for current filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        r.record_type === 'PURCHASE_REGISTER'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {r.record_type === 'PURCHASE_REGISTER' ? 'Books' : 'GSTR-2B'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 truncate max-w-[180px]">{r.supplier_name || 'Supplier'}</p>
                      <p className="text-[10px] font-mono text-slate-400">{r.gstin_supplier}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{r.invoice_number}</p>
                      <p className="text-[10px] text-slate-400">{r.invoice_date}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      ₹{r.taxable_value.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{(r.cgst + r.sgst).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹{r.igst.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-navy-950">
                      ₹{r.total_tax.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(r.match_status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.match_status !== 'FULLY_MATCHED' ? (
                        <button
                          onClick={() => {
                            setSelectedRecord(r);
                            setVerifyModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded border border-brand-200 transition-colors"
                        >
                          Verify & Approve
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 flex items-center justify-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Import GST Records (Excel / CSV / GSTR-2B)"
        subtitle="Upload your accounting Purchase Register or official Govt GSTR-2B file"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Record Type Destination</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUploadType('GSTR2B')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  uploadType === 'GSTR2B'
                    ? 'border-brand-600 bg-brand-50/50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                GSTR-2B Portal Data
              </button>
              <button
                type="button"
                onClick={() => setUploadType('PURCHASE_REGISTER')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  uploadType === 'PURCHASE_REGISTER'
                    ? 'border-brand-600 bg-brand-50/50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Purchase Register (Books)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select File (.xlsx, .xls, .csv)</label>
            <input
              type="file"
              required
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800"
            />
          </div>

          {uploadMessage && (
            <p className="text-xs font-semibold text-brand-600 p-2 bg-brand-50 rounded-lg">
              {uploadMessage}
            </p>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {uploading ? 'Importing...' : 'Upload & Process'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Verification Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Human Verification & Exception Approval"
        subtitle={`Invoice #${selectedRecord?.invoice_number} • ${selectedRecord?.supplier_name}`}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
            <p><span className="text-slate-500 font-medium">Issue Detected:</span> <span className="font-bold text-rose-600">{selectedRecord?.remarks}</span></p>
            <p><span className="text-slate-500 font-medium">Invoice Value:</span> ₹{selectedRecord?.invoice_value.toLocaleString('en-IN')}</p>
            <p><span className="text-slate-500 font-medium">Total Tax / ITC:</span> ₹{selectedRecord?.total_tax.toLocaleString('en-IN')}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Auditor Remarks / Reconciliation Note</label>
            <textarea
              rows={3}
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="e.g. Verified with physical tax invoice, supplier confirmed GSTR-1 amendment in next period..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => handleVerifySubmit('REJECT')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white rounded-lg shadow-xs"
            >
              Disallow / Reject ITC
            </button>
            <button
              onClick={() => handleVerifySubmit('APPROVE')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-lg shadow-xs"
            >
              Approve Exception & Claim ITC
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
