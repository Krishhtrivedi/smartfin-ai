import React, { useState, useEffect } from 'react';
import {
  Building2,
  Upload,
  RefreshCw,
  Clock,
  ArrowUpRight,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { VendorSummary, Invoice } from '../types';
import { Modal } from '../components/common/Modal';

export const VendorReconciliation: React.FC = () => {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [reconciliationData, setReconciliationData] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const data = await api.getVendors();
      setVendors(data);
      if (data.length > 0 && !selectedVendorId) {
        setSelectedVendorId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendorId) {
      fetchVendorDetails(selectedVendorId);
    }
  }, [selectedVendorId]);

  const fetchVendorDetails = async (id: number) => {
    setReconLoading(true);
    try {
      const [recon, invs] = await Promise.all([
        api.reconcileVendor(id),
        api.getVendorInvoices(id)
      ]);
      setReconciliationData(recon);
      setInvoices(invs);
    } catch (err) {
      console.error(err);
    } finally {
      setReconLoading(false);
    }
  };

  const handleStatementUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedVendorId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.uploadGSTFile(formData); // or statement upload
      await fetchVendorDetails(selectedVendorId);
      setUploadModalOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      alert(`Error uploading statement: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const totalOutstanding = vendors.reduce((sum, v) => sum + v.outstanding_balance, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span>Vendor Accounts Ledger & Statement Reconciliation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-reconciles supplier purchase invoices, payment vouchers, and statement balances.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-3.5 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Vendor Statement</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Vendor Master List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Vendors ({vendors.length})
            </span>
            <span className="text-[11px] font-bold text-rose-600">
              Total Due: ₹{totalOutstanding.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {vendors.map((v) => {
              const isSelected = selectedVendorId === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVendorId(v.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/40 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{v.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500">{v.payment_terms_days}d terms</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{v.gstin}</p>

                  <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">Balance Due:</span>
                    <span className={`font-bold ${v.outstanding_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{v.outstanding_balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Vendor Reconciliation Details */}
        <div className="lg:col-span-2 space-y-5">
          {reconLoading ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
              Loading vendor ledger...
            </div>
          ) : reconciliationData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Purchases</p>
                  <p className="text-lg font-bold text-navy-950 mt-1">₹{reconciliationData.total_purchases.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.invoices_count} bills recorded</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">₹{reconciliationData.total_payments.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.payments_count} payment vouchers</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Outstanding Due</p>
                  <p className="text-lg font-bold text-rose-600 mt-1">₹{reconciliationData.outstanding_balance.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reconciliationData.unpaid_invoices_count} unpaid invoices</p>
                </div>
              </div>

              {/* Aging Breakdown Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2">
                  Accounts Payable Aging Analysis
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800">
                    <p className="text-[10px] font-bold">0 - 30 Days</p>
                    <p className="font-bold text-sm mt-0.5">₹{reconciliationData.aging.current_0_30.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 text-brand-800">
                    <p className="text-[10px] font-bold">31 - 60 Days</p>
                    <p className="font-bold text-sm mt-0.5">₹{reconciliationData.aging.period_31_60.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800">
                    <p className="text-[10px] font-bold">61 - 90 Days</p>
                    <p className="font-bold text-sm mt-0.5">₹{reconciliationData.aging.period_61_90.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800">
                    <p className="text-[10px] font-bold">&gt; 90 Days (Overdue)</p>
                    <p className="font-bold text-sm mt-0.5">₹{reconciliationData.aging.over_90.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              {/* Invoices List Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">Purchase Invoices</h4>
                  <span className="text-[11px] text-slate-500">{invoices.length} total</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Invoice No</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-right">Taxable</th>
                        <th className="py-2.5 px-4 text-right">Tax (GST)</th>
                        <th className="py-2.5 px-4 text-right">Total Amount</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{inv.invoice_number}</td>
                          <td className="py-2.5 px-4 text-slate-500">{inv.invoice_date}</td>
                          <td className="py-2.5 px-4 text-right">₹{inv.taxable_amount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">₹{inv.total_tax.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-navy-950">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
              Select a vendor from the list to view reconciliation details.
            </div>
          )}
        </div>
      </div>

      {/* Upload Statement Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Vendor Statement"
        subtitle="Compare external supplier statement with internal book records"
      >
        <form onSubmit={handleStatementUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Statement File (.xlsx, .csv)</label>
            <input
              type="file"
              required
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-900 file:text-white hover:file:bg-navy-800"
            />
          </div>

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
              {uploading ? 'Processing...' : 'Upload & Reconcile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
